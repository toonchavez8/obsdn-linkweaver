import { App, TFile, CachedMetadata, MarkdownView, HoverParent, HoverPopover, Component } from 'obsidian';
import { LinkWeaverSettings } from '../settings';

export interface LinkPreview {
	linkText: string;
	targetFile: TFile | null;
	context: string;
	lineNumber: number;
	type: 'outgoing' | 'incoming' | 'unresolved';
}

export class LinkPreviewManager extends Component {
	private app: App;
	private settings: LinkWeaverSettings;
	private hoverPopovers: Map<HTMLElement, HoverPopover> = new Map();

	constructor(app: App, settings: LinkWeaverSettings) {
		super();
		this.app = app;
		this.settings = settings;
	}

	updateSettings(settings: LinkWeaverSettings) {
		this.settings = settings;
	}

	/**
	 * Get context around a link at a specific line
	 */
	async getLinkContext(
		file: TFile, 
		lineNumber: number, 
		contextLength: number = 200
	): Promise<string> {
		const content = await this.app.vault.read(file);
		const lines = content.split('\n');
		
		if (lineNumber < 0 || lineNumber >= lines.length) {
			return '';
		}

		const targetLine = lines[lineNumber];
		let context = targetLine;
		let currentLength = targetLine.length;

		// Add lines before
		let beforeIndex = lineNumber - 1;
		while (beforeIndex >= 0 && currentLength < contextLength) {
			const line = lines[beforeIndex];
			context = line + '\n' + context;
			currentLength += line.length + 1;
			beforeIndex--;
		}

		// Add lines after
		let afterIndex = lineNumber + 1;
		while (afterIndex < lines.length && currentLength < contextLength) {
			const line = lines[afterIndex];
			context = context + '\n' + line;
			currentLength += line.length + 1;
			afterIndex++;
		}

		// Truncate if too long
		if (context.length > contextLength) {
			const half = Math.floor(contextLength / 2);
			const linePos = context.indexOf(targetLine);
			const start = Math.max(0, linePos - half);
			const end = Math.min(context.length, linePos + targetLine.length + half);
			context = (start > 0 ? '...' : '') + 
			          context.substring(start, end) + 
			          (end < context.length ? '...' : '');
		}

		return context;
	}

	/**
	 * Get all link previews for a file
	 */
	async getFileLinkPreviews(
		file: TFile,
		filterType?: 'outgoing' | 'incoming' | 'unresolved'
	): Promise<LinkPreview[]> {
		const previews: LinkPreview[] = [];
		const cache = this.app.metadataCache.getFileCache(file);

		if (!cache) return previews;

		// Get outgoing links
		if (!filterType || filterType === 'outgoing' || filterType === 'unresolved') {
			const links = cache.links || [];
			const embeds = cache.embeds || [];
			const allLinks = [...links, ...embeds];

			for (const link of allLinks) {
				const targetFile = this.app.metadataCache.getFirstLinkpathDest(link.link, file.path);
				const isUnresolved = !targetFile;
				
				if (filterType === 'unresolved' && !isUnresolved) continue;
				if (filterType === 'outgoing' && isUnresolved) continue;

				const context = await this.getLinkContext(
					file, 
					link.position.start.line, 
					this.settings.linkPreviewLength
				);

				previews.push({
					linkText: link.link,
					targetFile,
					context,
					lineNumber: link.position.start.line,
					type: isUnresolved ? 'unresolved' : 'outgoing'
				});
			}
		}

		// Get incoming links (backlinks)
		if (!filterType || filterType === 'incoming') {
			const backlinks = this.app.metadataCache.getBacklinksForFile(file);
			if (backlinks) {
				for (const [sourcePath, links] of backlinks.data) {
					const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
					if (!(sourceFile instanceof TFile)) continue;

					for (const linkInfo of links) {
						const context = await this.getLinkContext(
							sourceFile,
							linkInfo.position.start.line,
							this.settings.linkPreviewLength
						);

						previews.push({
							linkText: file.basename,
							targetFile: file,
							context,
							lineNumber: linkInfo.position.start.line,
							type: 'incoming'
						});
					}
				}
			}
		}

		return previews;
	}

	/**
	 * Show enhanced preview on hover
	 */
	enhanceHoverPreview(
		linkEl: HTMLElement,
		linkText: string,
		sourcePath: string,
		parent: HoverParent
	): void {
		const targetFile = this.app.metadataCache.getFirstLinkpathDest(linkText, sourcePath);
		
		if (!targetFile) return;

		// Add hover event
		linkEl.addEventListener('mouseenter', async (event) => {
			const hoverPopover = this.app.workspace.createHoverPopover(
				parent,
				linkEl,
				true
			);

			if (!hoverPopover) return;

			// Get link context
			const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
			if (!(sourceFile instanceof TFile)) return;

			const previews = await this.getFileLinkPreviews(targetFile);
			const preview = previews[0]; // Get first preview

			if (preview) {
				// Show preview with context
				const previewEl = hoverPopover.contentEl;
				previewEl.createEl('h4', { text: targetFile.basename });
				previewEl.createEl('pre', { 
					text: preview.context,
					cls: 'linkweaver-preview-context' 
				});
			}

			this.hoverPopovers.set(linkEl, hoverPopover);
		});

		linkEl.addEventListener('mouseleave', () => {
			const popover = this.hoverPopovers.get(linkEl);
			if (popover) {
				popover.hide();
				this.hoverPopovers.delete(linkEl);
			}
		});
	}

	/**
	 * Filter links by type in active view
	 */
	async filterLinksInView(
		filterType: 'outgoing' | 'incoming' | 'unresolved'
	): Promise<LinkPreview[]> {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView || !activeView.file) {
			return [];
		}

		return this.getFileLinkPreviews(activeView.file, filterType);
	}

	/**
	 * Clean up hover popovers
	 */
	onunload(): void {
		this.hoverPopovers.forEach(popover => popover.hide());
		this.hoverPopovers.clear();
	}
}
