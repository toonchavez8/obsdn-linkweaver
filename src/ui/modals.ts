import { App, Modal, TFile } from 'obsidian';
import { ValidationResult, LinkInfo } from '../links/link-manager';

export class ValidationResultsModal extends Modal {
	private result: ValidationResult;

	constructor(app: App, result: ValidationResult) {
		super(app);
		this.result = result;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Link Validation Results' });

		// Summary section
		const summary = contentEl.createDiv({ cls: 'linkweaver-validation-summary' });
		summary.createEl('p', { 
			text: `Scanned ${this.result.totalFiles} files with ${this.result.totalLinks} total links` 
		});

		// Unresolved links section
		const unresolvedSection = contentEl.createDiv({ cls: 'linkweaver-validation-section' });
		unresolvedSection.createEl('h3', { 
			text: `Unresolved Links (${this.result.unresolvedLinks.length})` 
		});

		if (this.result.unresolvedLinks.length > 0) {
			const unresolvedList = unresolvedSection.createEl('ul');
			this.result.unresolvedLinks.forEach(link => {
				const item = unresolvedList.createEl('li');
				item.createEl('strong', { text: link.sourceFile.basename });
				item.createEl('span', { text: ` (line ${link.line + 1}): ` });
				item.createEl('code', { text: link.linkText });
				
				// Add click handler to open file
				item.style.cursor = 'pointer';
				item.addEventListener('click', () => {
					this.openFileAtLine(link.sourceFile, link.line);
				});
			});
		} else {
			unresolvedSection.createEl('p', { 
				text: 'No unresolved links found!',
				cls: 'linkweaver-success' 
			});
		}

		// Broken links section
		const brokenSection = contentEl.createDiv({ cls: 'linkweaver-validation-section' });
		brokenSection.createEl('h3', { 
			text: `Broken Links (${this.result.brokenLinks.length})` 
		});

		if (this.result.brokenLinks.length > 0) {
			const brokenList = brokenSection.createEl('ul');
			this.result.brokenLinks.forEach(link => {
				const item = brokenList.createEl('li');
				item.createEl('strong', { text: link.sourceFile.basename });
				item.createEl('span', { text: ` (line ${link.line + 1}): ` });
				item.createEl('code', { text: link.linkText });
				
				// Add click handler to open file
				item.style.cursor = 'pointer';
				item.addEventListener('click', () => {
					this.openFileAtLine(link.sourceFile, link.line);
				});
			});
		} else {
			brokenSection.createEl('p', { 
				text: 'No broken links found!',
				cls: 'linkweaver-success' 
			});
		}

		// Actions
		const actions = contentEl.createDiv({ cls: 'linkweaver-validation-actions' });
		
		const closeButton = actions.createEl('button', { text: 'Close' });
		closeButton.addEventListener('click', () => this.close());

		// Export button
		const exportButton = actions.createEl('button', { text: 'Export to Clipboard' });
		exportButton.addEventListener('click', () => {
			this.exportToClipboard();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private async openFileAtLine(file: TFile, line: number) {
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(file);
		
		// Jump to the line
		const editor = this.app.workspace.activeEditor?.editor;
		if (editor) {
			editor.setCursor({ line, ch: 0 });
			editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
		}

		this.close();
	}

	private exportToClipboard() {
		let report = '# Link Validation Report\n\n';
		report += `Generated: ${new Date(this.result.timestamp).toLocaleString()}\n`;
		report += `Files scanned: ${this.result.totalFiles}\n`;
		report += `Total links: ${this.result.totalLinks}\n\n`;

		if (this.result.unresolvedLinks.length > 0) {
			report += `## Unresolved Links (${this.result.unresolvedLinks.length})\n\n`;
			this.result.unresolvedLinks.forEach(link => {
				report += `- ${link.sourceFile.path} (line ${link.line + 1}): \`${link.linkText}\`\n`;
			});
			report += '\n';
		}

		if (this.result.brokenLinks.length > 0) {
			report += `## Broken Links (${this.result.brokenLinks.length})\n\n`;
			this.result.brokenLinks.forEach(link => {
				report += `- ${link.sourceFile.path} (line ${link.line + 1}): \`${link.linkText}\`\n`;
			});
		}

		navigator.clipboard.writeText(report);
		console.log('Validation report copied to clipboard');
	}
}

export class OrphanedNotesModal extends Modal {
	private orphanedFiles: TFile[];

	constructor(app: App, orphanedFiles: TFile[]) {
		super(app);
		this.orphanedFiles = orphanedFiles;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Orphaned Notes' });

		contentEl.createEl('p', { 
			text: `Found ${this.orphanedFiles.length} notes with no incoming or outgoing links` 
		});

		if (this.orphanedFiles.length > 0) {
			const list = contentEl.createEl('ul');
			this.orphanedFiles.forEach(file => {
				const item = list.createEl('li');
				item.createEl('span', { text: file.path });
				
				// Add click handler to open file
				item.style.cursor = 'pointer';
				item.addEventListener('click', async () => {
					const leaf = this.app.workspace.getLeaf(false);
					await leaf.openFile(file);
					this.close();
				});
			});
		} else {
			contentEl.createEl('p', { 
				text: 'No orphaned notes found! All notes are connected.',
				cls: 'linkweaver-success' 
			});
		}

		// Close button
		const actions = contentEl.createDiv({ cls: 'linkweaver-validation-actions' });
		const closeButton = actions.createEl('button', { text: 'Close' });
		closeButton.addEventListener('click', () => this.close());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class LinkStatsModal extends Modal {
	private file: TFile;
	private stats: { outgoing: number; incoming: number; unresolved: number };

	constructor(app: App, file: TFile, stats: { outgoing: number; incoming: number; unresolved: number }) {
		super(app);
		this.file = file;
		this.stats = stats;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Link Statistics' });
		contentEl.createEl('h3', { text: this.file.basename });

		const statsGrid = contentEl.createDiv({ cls: 'linkweaver-link-stats' });

		// Outgoing links
		const outgoingStat = statsGrid.createDiv({ cls: 'linkweaver-stat-item' });
		outgoingStat.createEl('div', { text: 'Outgoing Links', cls: 'linkweaver-stat-label' });
		outgoingStat.createEl('div', { text: String(this.stats.outgoing), cls: 'linkweaver-stat-value' });

		// Incoming links
		const incomingStat = statsGrid.createDiv({ cls: 'linkweaver-stat-item' });
		incomingStat.createEl('div', { text: 'Incoming Links', cls: 'linkweaver-stat-label' });
		incomingStat.createEl('div', { text: String(this.stats.incoming), cls: 'linkweaver-stat-value' });

		// Unresolved links
		const unresolvedStat = statsGrid.createDiv({ cls: 'linkweaver-stat-item' });
		unresolvedStat.createEl('div', { text: 'Unresolved Links', cls: 'linkweaver-stat-label' });
		unresolvedStat.createEl('div', { text: String(this.stats.unresolved), cls: 'linkweaver-stat-value' });

		// Total
		const totalStat = statsGrid.createDiv({ cls: 'linkweaver-stat-item' });
		totalStat.createEl('div', { text: 'Total Connections', cls: 'linkweaver-stat-label' });
		totalStat.createEl('div', { 
			text: String(this.stats.outgoing + this.stats.incoming), 
			cls: 'linkweaver-stat-value' 
		});

		// Close button
		const actions = contentEl.createDiv({ cls: 'linkweaver-validation-actions' });
		const closeButton = actions.createEl('button', { text: 'Close' });
		closeButton.addEventListener('click', () => this.close());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class BatchOperationModal extends Modal {
	private onConfirm: (oldLink: string, newLink: string, dryRun: boolean) => void;
	private title: string;
	private description: string;

	constructor(
		app: App, 
		title: string,
		description: string,
		onConfirm: (oldLink: string, newLink: string, dryRun: boolean) => void
	) {
		super(app);
		this.title = title;
		this.description = description;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: this.title });
		contentEl.createEl('p', { text: this.description });

		// Old link input
		const oldLinkDiv = contentEl.createDiv({ cls: 'linkweaver-input-group' });
		oldLinkDiv.createEl('label', { text: 'Old link:' });
		const oldLinkInput = oldLinkDiv.createEl('input', { 
			type: 'text',
			placeholder: 'e.g., OldNote or path/to/OldNote'
		});
		oldLinkInput.style.width = '100%';
		oldLinkInput.style.marginBottom = '10px';

		// New link input
		const newLinkDiv = contentEl.createDiv({ cls: 'linkweaver-input-group' });
		newLinkDiv.createEl('label', { text: 'New link:' });
		const newLinkInput = newLinkDiv.createEl('input', { 
			type: 'text',
			placeholder: 'e.g., NewNote or path/to/NewNote'
		});
		newLinkInput.style.width = '100%';
		newLinkInput.style.marginBottom = '20px';

		// Action buttons
		const actions = contentEl.createDiv({ cls: 'linkweaver-validation-actions' });
		
		const previewButton = actions.createEl('button', { text: 'Preview (Dry Run)' });
		previewButton.addEventListener('click', () => {
			if (!oldLinkInput.value || !newLinkInput.value) {
				return;
			}
			this.onConfirm(oldLinkInput.value, newLinkInput.value, true);
			this.close();
		});

		const confirmButton = actions.createEl('button', { text: 'Replace All', cls: 'mod-cta' });
		confirmButton.addEventListener('click', () => {
			if (!oldLinkInput.value || !newLinkInput.value) {
				return;
			}
			this.onConfirm(oldLinkInput.value, newLinkInput.value, false);
			this.close();
		});

		const cancelButton = actions.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => this.close());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class BatchPreviewModal extends Modal {
	private preview: Array<{ file: TFile; changes: number }>;
	private onConfirm: () => void;

	constructor(
		app: App,
		preview: Array<{ file: TFile; changes: number }>,
		onConfirm: () => void
	) {
		super(app);
		this.preview = preview;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Batch Operation Preview' });
		contentEl.createEl('p', { 
			text: `This operation will modify ${this.preview.length} file(s)` 
		});

		// File list
		const fileList = contentEl.createEl('ul', { cls: 'linkweaver-validation-list' });
		this.preview.forEach(item => {
			const li = fileList.createEl('li');
			li.createEl('strong', { text: item.file.basename });
			li.createEl('span', { text: ` - ${item.changes} link(s) will be updated` });
			
			li.style.cursor = 'pointer';
			li.addEventListener('click', () => {
				this.app.workspace.getLeaf().openFile(item.file);
			});
		});

		// Action buttons
		const actions = contentEl.createDiv({ cls: 'linkweaver-validation-actions' });
		
		const confirmButton = actions.createEl('button', { text: 'Confirm Changes', cls: 'mod-cta' });
		confirmButton.addEventListener('click', () => {
			this.onConfirm();
			this.close();
		});

		const cancelButton = actions.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => this.close());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class LinkPreviewModal extends Modal {
	private previews: Array<any>;
	private filterType: string;

	constructor(app: App, previews: Array<any>, filterType: string) {
		super(app);
		this.previews = previews;
		this.filterType = filterType;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: `${this.capitalize(this.filterType)} Links Preview` });
		contentEl.createEl('p', { text: `Found ${this.previews.length} ${this.filterType} link(s)` });

		const previewList = contentEl.createDiv({ cls: 'linkweaver-preview-list' });
		
		this.previews.forEach(preview => {
			const previewItem = previewList.createDiv({ cls: 'linkweaver-preview-item' });
			
			const linkInfo = previewItem.createDiv({ cls: 'linkweaver-preview-header' });
			linkInfo.createEl('strong', { text: preview.linkText });
			linkInfo.createEl('span', { 
				text: ` (line ${preview.lineNumber + 1})`,
				cls: 'linkweaver-preview-line' 
			});
			linkInfo.createEl('span', {
				text: ` [${preview.type}]`,
				cls: `linkweaver-preview-type-${preview.type}`
			});

			const contextEl = previewItem.createEl('pre', { 
				cls: 'linkweaver-preview-context',
				text: preview.context 
			});
			contextEl.style.whiteSpace = 'pre-wrap';
			contextEl.style.maxHeight = '100px';
			contextEl.style.overflow = 'auto';

			previewItem.style.cursor = 'pointer';
			previewItem.addEventListener('click', () => {
				if (preview.targetFile) {
					this.app.workspace.getLeaf().openFile(preview.targetFile);
				}
			});
		});

		const actions2 = contentEl.createDiv({ cls: 'linkweaver-validation-actions' });
		const closeButton = actions2.createEl('button', { text: 'Close' });
		closeButton.addEventListener('click', () => this.close());
	}

	private capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

