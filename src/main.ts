import { Plugin, Notice, TFile } from 'obsidian';
import { LinkWeaverSettings, DEFAULT_SETTINGS } from './settings';
import { LinkWeaverSettingTab } from './ui/settings-tab';
import { SequenceDetector } from './navigation/sequence-detector';
import { Navigator } from './navigation/navigator';
import { LinkInserter } from './navigation/link-inserter';
import { LinkManager } from './links/link-manager';
import { BatchOperations } from './links/batch-operations';
import { LinkPreviewManager } from './links/link-preview';
import { PathFinder } from './discovery/path-finder';
import {
	ValidationResultsModal,
	OrphanedNotesModal,
	LinkStatsModal,
	BatchOperationModal,
	BatchPreviewModal,
	LinkPreviewModal,
	PathFinderModal,
	SimilarNotesModal
} from './ui/modals';

export default class LinkWeaverPlugin extends Plugin {
	settings!: LinkWeaverSettings;
	detector!: SequenceDetector;
	navigator!: Navigator;
	linkInserter!: LinkInserter;
	linkManager!: LinkManager;
	batchOps!: BatchOperations;
	linkPreview!: LinkPreviewManager;
	pathFinder!: PathFinder;
	statusBarItem: HTMLElement | null = null;

	async onload() {
		console.log('Loading LinkWeaver plugin');

		await this.loadSettings();

		this.detector = new SequenceDetector(this.app.vault, this.settings.customPatterns);
		this.navigator = new Navigator(this.app, this.detector, this.settings);
		this.linkInserter = new LinkInserter(this.app, this.detector, this.settings);
		this.linkManager = new LinkManager(this.app, this.settings.validationRules);
		this.batchOps = new BatchOperations(this.app);
		this.linkPreview = new LinkPreviewManager(this.app, this.settings);
		this.pathFinder = new PathFinder(this.app, this.settings);

		this.addSettingTab(new LinkWeaverSettingTab(this.app, this));
		this.registerCommands();

		if (this.settings.showSequenceInStatusBar) {
			this.initializeStatusBar();
		}

		this.registerEventHandlers();
	}

	onunload() {
		console.log('Unloading LinkWeaver plugin');
		this.statusBarItem?.remove();
		this.linkPreview?.onunload();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);

		this.detector?.updatePatterns(this.settings.customPatterns);
		this.navigator?.updateSettings(this.settings);
		this.linkInserter?.updateSettings(this.settings);
		this.linkPreview?.updateSettings(this.settings);
		this.pathFinder?.updateSettings(this.settings);
		this.linkManager?.updateValidationRules(this.settings.validationRules);
		this.updateStatusBar();
	}

	private registerCommands() {
		this.addCommand({
			id: 'navigate-next',
			name: 'Navigate to next in sequence',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'ArrowRight' }],
			callback: async () => {
				await this.navigator.navigateNext();
				this.updateStatusBar();
			}
		});

		this.addCommand({
			id: 'navigate-previous',
			name: 'Navigate to previous in sequence',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'ArrowLeft' }],
			callback: async () => {
				await this.navigator.navigatePrevious();
				this.updateStatusBar();
			}
		});

		this.addCommand({
			id: 'show-sequence-overview',
			name: 'Show sequence overview',
			callback: () => this.logSequenceOverview()
		});

		this.addCommand({
			id: 'show-link-stats',
			name: 'Show link statistics',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					new Notice('No active file');
					return;
				}

				const stats = this.linkManager.getLinkStats(activeFile);
				new LinkStatsModal(this.app, activeFile, stats).open();
			}
		});

		this.addCommand({
			id: 'find-orphaned',
			name: 'Find orphaned notes',
			callback: () => {
				const orphaned = this.linkManager.getOrphanedNotes();
				new OrphanedNotesModal(this.app, orphaned).open();
			}
		});

		this.addCommand({
			id: 'find-path',
			name: 'Find path between notes',
			callback: () => {
				new PathFinderModal(this.app, this.pathFinder, this.settings.maxPathDepth).open();
			}
		});

		this.addCommand({
			id: 'find-similar-notes',
			name: 'Find similar notes',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					new Notice('No active file');
					return;
				}

				const similarNotes = this.pathFinder.findSimilarNotes(activeFile);
				new SimilarNotesModal(this.app, activeFile, similarNotes).open();
			}
		});

		this.addCommand({
			id: 'insert-sequence-links',
			name: 'Insert sequence navigation links',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					new Notice('No active file');
					return;
				}

				await this.linkInserter.insertSequenceLinks(activeFile);
			}
		});

		this.addCommand({
			id: 'update-all-sequence-links',
			name: 'Update all sequence links',
			callback: async () => {
				await this.linkInserter.updateAllSequenceLinks();
			}
		});

		this.addCommand({
			id: 'validate-all-links',
			name: 'Validate all links',
			callback: async () => {
				new Notice('Validating all links...');
				const result = await this.linkManager.validateAllLinks();
				new ValidationResultsModal(this.app, result).open();
			}
		});

		this.addCommand({
			id: 'validate-file-links',
			name: 'Validate links in current file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					new Notice('No active file');
					return;
				}

				const links = await this.linkManager.validateFileLinks(activeFile);
				const unresolved = links.filter(link => !link.isResolved);
				new Notice(unresolved.length > 0
					? `Found ${unresolved.length} unresolved link(s)`
					: 'All links are valid!');
			}
		});

		this.addCommand({
			id: 'find-hub-pages',
			name: 'Find hub pages',
			callback: () => {
				const hubs = this.linkManager.getHubPages(10);
				if (hubs.length === 0) {
					new Notice('No hub pages found');
					return;
				}

				const message = hubs.slice(0, 5)
					.map((hubPage, resultIndex) => `${resultIndex + 1}. ${hubPage.file.basename} (${hubPage.linkCount} links)`)
					.join('\n');
				console.log('Top Hub Pages:\n' + message);
				new Notice(`Found ${hubs.length} hub pages (see console)`);
			}
		});

		this.addCommand({
			id: 'export-stats-csv',
			name: 'Export link statistics to CSV',
			callback: () => {
				const csv = this.linkManager.exportStatsToCSV();
				navigator.clipboard.writeText(csv);
				new Notice('Link statistics copied to clipboard as CSV');
			}
		});

		this.addCommand({
			id: 'export-stats-json',
			name: 'Export link statistics to JSON',
			callback: () => {
				const json = this.linkManager.exportStatsToJSON();
				navigator.clipboard.writeText(json);
				new Notice('Link statistics copied to clipboard as JSON');
			}
		});

		this.addCommand({
			id: 'batch-replace-link',
			name: 'Batch replace link',
			callback: () => {
				const modal = new BatchOperationModal(
					this.app,
					'Batch Link Replacement',
					'Replace all instances of a link across the vault',
					async (oldLink, newLink, dryRun) => this.handleBatchReplace(oldLink, newLink, dryRun)
				);
				modal.open();
			}
		});

		this.addCommand({
			id: 'undo-batch-operation',
			name: 'Undo last batch operation',
			callback: async () => {
				await this.batchOps.undoLastOperation();
			}
		});

		this.addCommand({
			id: 'show-outgoing-links',
			name: 'Show outgoing links with preview',
			callback: async () => this.showLinkPreview('outgoing')
		});

		this.addCommand({
			id: 'show-incoming-links',
			name: 'Show incoming links with preview',
			callback: async () => this.showLinkPreview('incoming')
		});

		this.addCommand({
			id: 'show-unresolved-links',
			name: 'Show unresolved links with preview',
			callback: async () => this.showLinkPreview('unresolved')
		});
	}

	private initializeStatusBar() {
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.addClass('linkweaver-status-bar');
		this.updateStatusBar();

		this.statusBarItem.addEventListener('click', () => this.logSequenceOverview());
	}

	private updateStatusBar() {
		if (!this.statusBarItem || !this.settings.showSequenceInStatusBar) {
			return;
		}

		const info = this.navigator.getSequenceInfo();
		if (!info) {
			this.statusBarItem.style.display = 'none';
			return;
		}

		const position = `${info.currentIndex + 1}/${info.files.length}`;
		this.statusBarItem.setText(`LinkWeaver ${position} | ${info.pattern}`);
		this.statusBarItem.style.display = 'block';
	}

	private registerEventHandlers() {
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => this.updateStatusBar())
		);

		this.registerEvent(
			this.app.workspace.on('file-open', () => this.updateStatusBar())
		);

		this.registerEvent(
			this.app.vault.on('rename', async (file, oldPath) => {
				this.detector.invalidateFile(oldPath);

				if ('path' in file) {
					this.detector.invalidateFile(file.path);
				}

				if (this.settings.autoUpdateLinks && file instanceof TFile) {
					await this.batchOps.updateLinksOnRename(oldPath, file.path);
				}

				this.updateStatusBar();
			})
		);

		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if ('path' in file) {
					this.detector.invalidateFile(file.path);
				}
				this.updateStatusBar();
			})
		);

		this.registerEvent(
			this.app.vault.on('create', async (file) => {
				this.detector.clearCache();

				if (this.settings.autoInsertSequenceLinks && file instanceof TFile && file.extension === 'md') {
					await this.linkInserter.insertSequenceLinks(file);
				}

				this.updateStatusBar();
			})
		);

		this.registerEvent(
			this.app.vault.on('modify', async (file) => {
				if (!this.settings.validateLinksOnSave || !(file instanceof TFile) || file.extension !== 'md') {
					return;
				}

				const links = await this.linkManager.validateFileLinks(file);
				const unresolved = links.filter(link => !link.isResolved);
				if (unresolved.length > 0) {
					new Notice(`${file.basename}: ${unresolved.length} unresolved link(s)`);
				}
			})
		);
	}

	private logSequenceOverview(): void {
		const info = this.navigator.getSequenceInfo();
		if (!info) {
			new Notice('No sequence detected for this file');
			return;
		}

		const fileList = info.files
			.map((sequenceFile, fileIndex) => `${fileIndex === info.currentIndex ? '-> ' : '   '}${fileIndex + 1}. ${sequenceFile.basename}`)
			.join('\n');
		console.log(`Sequence: ${info.pattern}\n${fileList}`);
	}

	private async handleBatchReplace(oldLink: string, newLink: string, dryRun: boolean): Promise<void> {
		if (!dryRun) {
			const result = await this.batchOps.batchReplaceLink(oldLink, newLink, false);
			new Notice(`Replaced ${result.success} link(s) in ${result.success} file(s)`);
			return;
		}

		const preview = await this.batchOps.previewChanges(oldLink, newLink);
		if (preview.length === 0) {
			new Notice('No changes would be made');
			return;
		}

		new BatchPreviewModal(
			this.app,
			preview,
			async () => {
				const result = await this.batchOps.batchReplaceLink(oldLink, newLink, false);
				new Notice(`Replaced ${result.success} link(s) in ${result.success} file(s)`);
			}
		).open();
	}

	private async showLinkPreview(filterType: 'outgoing' | 'incoming' | 'unresolved'): Promise<void> {
		const previews = await this.linkPreview.filterLinksInView(filterType);
		if (previews.length === 0) {
			new Notice(`No ${filterType} links found`);
			return;
		}

		new LinkPreviewModal(this.app, previews, filterType).open();
	}
}
