import { App, TFile, MarkdownView, HoverParent, Component } from 'obsidian';
import { LinkWeaverSettings } from '../settings';

export type LinkPreviewType = 'outgoing' | 'incoming' | 'unresolved';

export interface LinkPreview {
	linkText: string;
	targetFile: TFile | null;
	context: string;
	lineNumber: number;
	type: LinkPreviewType;
}

export class LinkPreviewManager extends Component {
	private readonly app: App;
	private settings: LinkWeaverSettings;
	private readonly hoverPopovers: Map<HTMLElement, HTMLElement> = new Map();

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
		filterType?: LinkPreviewType
	): Promise<LinkPreview[]> {
		const previews: LinkPreview[] = [];

		if (!filterType || filterType === 'outgoing' || filterType === 'unresolved') {
			const outgoingPreviews = await this.getOutgoingPreviews(file, filterType);
			previews.push(...outgoingPreviews);
		}

		if (!filterType || filterType === 'incoming') {
			const incomingPreviews = await this.getIncomingPreviews(file);
			previews.push(...incomingPreviews);
		}

		return previews;
	}

	/**
	 * Get outgoing link previews for a file
	 */
	private async getOutgoingPreviews(
		file: TFile,
		filterType?: LinkPreviewType
	): Promise<LinkPreview[]> {
		const previews: LinkPreview[] = [];
		const cache = this.app.metadataCache.getFileCache(file);

		if (!cache) return previews;

		const links = cache.links || [];
		const embeds = cache.embeds || [];
		const allLinks = [...links, ...embeds ?? []];

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

		return previews;
	}

	/**
	 * Get incoming link previews for a file
	 */
	private async getIncomingPreviews(file: TFile): Promise<LinkPreview[]> {
		const previews: LinkPreview[] = [];

		// Scan all markdown files for links that resolve to `file`
		const allFiles = this.app.vault.getMarkdownFiles();
		for (const sourceFile of allFiles) {
			if (sourceFile.path === file.path) continue;

			const cache = this.app.metadataCache.getFileCache(sourceFile);
			if (!cache) continue;

			const links = [...(cache.links || []), ...(cache.embeds || [])];
			for (const linkInfo of links) {
				const resolved = this.app.metadataCache.getFirstLinkpathDest(linkInfo.link, sourceFile.path);
				if (!resolved) continue;
				if (resolved.path !== file.path) continue;

				const context = await this.getLinkContext(
					sourceFile,
					linkInfo.position.start.line,
					this.settings.linkPreviewLength
				);

				previews.push({
					linkText: sourceFile.basename,
					targetFile: file,
					context,
					lineNumber: linkInfo.position.start.line,
					type: 'incoming'
				});
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
		_parent: HoverParent
	): void {
		const targetFile = this.app.metadataCache.getFirstLinkpathDest(linkText, sourcePath);
		if (!targetFile) return;

		// Add hover event to show a simple DOM popover
		linkEl.addEventListener('mouseenter', async (event) => {
			// Prevent duplicated popovers
			if (this.hoverPopovers.has(linkEl)) return;

			const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
			if (!(sourceFile instanceof TFile)) return;

			const previews = await this.getFileLinkPreviews(targetFile);
			const preview = previews[0];
			if (!preview) return;

			const pop = document.createElement('div');
			pop.className = 'linkweaver-hover-popover';
			pop.style.position = 'absolute';
			pop.style.zIndex = '9999';
			pop.style.minWidth = '200px';
			pop.style.maxWidth = '520px';
			pop.style.padding = '8px';
			pop.style.border = '1px solid var(--background-modifier-border)';
			pop.style.background = 'var(--background-primary)';
			pop.style.boxShadow = 'var(--shadow-elevation-8)';
			pop.style.borderRadius = '6px';

			const title = document.createElement('div');
			title.textContent = targetFile.basename;
			title.style.fontWeight = '600';
			title.style.marginBottom = '6px';
			pop.appendChild(title);

			const pre = document.createElement('pre');
			pre.textContent = preview.context;
			pre.className = 'linkweaver-preview-context';
			pre.style.whiteSpace = 'pre-wrap';
			pre.style.maxHeight = '160px';
			pre.style.overflow = 'auto';
			pop.appendChild(pre);

			document.body.appendChild(pop);

			// Position the popover near the link element
			const rect = linkEl.getBoundingClientRect();
			const left = Math.min(rect.left + window.scrollX, window.innerWidth - pop.offsetWidth - 10);
			const top = rect.bottom + window.scrollY + 6;
			pop.style.left = `${left}px`;
			pop.style.top = `${top}px`;

			this.hoverPopovers.set(linkEl, pop);
		});

		linkEl.addEventListener('mouseleave', () => {
			const pop = this.hoverPopovers.get(linkEl);
			if (pop) {
				pop.remove();
				this.hoverPopovers.delete(linkEl);
			}
		});
	}

	/**
	 * Filter links by type in active view
	 */
	async filterLinksInView(
		filterType: LinkPreviewType
	): Promise<LinkPreview[]> {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView?.file) {
			return [];
		}

		return this.getFileLinkPreviews(activeView.file, filterType ?? undefined);
	}

	/**
	 * Clean up hover popovers
	 */
	onunload(): void {
		this.hoverPopovers.forEach(pop => pop?.remove?.());
		this.hoverPopovers.clear();
	}
}
