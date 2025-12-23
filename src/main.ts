import { Plugin, Notice, TFile } from 'obsidian';
import { LinkWeaverSettings, DEFAULT_SETTINGS } from './settings';
import { LinkWeaverSettingTab } from './ui/settings-tab';
import { SequenceDetector } from './navigation/sequence-detector';
import { Navigator } from './navigation/navigator';
import { LinkInserter } from './navigation/link-inserter';
import { LinkManager } from './links/link-manager';
import { BatchOperations } from './links/batch-operations';
import { LinkPreviewManager } from './links/link-preview';
import { ValidationResultsModal, OrphanedNotesModal, LinkStatsModal, BatchOperationModal, BatchPreviewModal, LinkPreviewModal } from './ui/modals';

export default class LinkWeaverPlugin extends Plugin {
	settings: LinkWeaverSettings;
	detector: SequenceDetector;
	navigator: Navigator;
	linkInserter: LinkInserter;
	linkManager: LinkManager;
	batchOps: BatchOperations;
	linkPreview: LinkPreviewManager;
	statusBarItem: HTMLElement | null = null;

	async onload() {
		console.log('Loading LinkWeaver plugin');

		// Load settings
		await this.loadSettings();

		// Initialize sequence detector, navigator, link inserter, link manager, batch operations, and link preview
		this.detector = new SequenceDetector(this.app.vault, this.settings.customPatterns);
		this.navigator = new Navigator(this.app, this.detector, this.settings);
		this.linkInserter = new LinkInserter(this.app, this.detector, this.settings);
		this.linkManager = new LinkManager(this.app);
		this.batchOps = new BatchOperations(this.app);
		this.linkPreview = new LinkPreviewManager(this.app, this.settings);

		// Add settings tab
		this.addSettingTab(new LinkWeaverSettingTab(this.app, this));

		// Register commands
		this.registerCommands();

		// Initialize status bar if enabled
		if (this.settings.showSequenceInStatusBar) {
			this.initializeStatusBar();
		}

		// Register event handlers
		this.registerEventHandlers();
	}

	onunload() {
		console.log('Unloading LinkWeaver plugin');
		if (this.statusBarItem) {
			this.statusBarItem.remove();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Update detector, navigator, link inserter, and link preview with new settings
		if (this.detector) {
			this.detector.updatePatterns(this.settings.customPatterns);
		}
		if (this.navigator) {
			this.navigator.updateSettings(this.settings);
		}
		if (this.linkInserter) {
			this.linkInserter.updateSettings(this.settings);
		}
		if (this.linkPreview) {
			this.linkPreview.updateSettings(this.settings);
		}
	}

	private registerCommands() {
		// Navigate to next in sequence
		this.addCommand({
			id: 'navigate-next',
			name: 'Navigate to next in sequence',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'ArrowRight' }],
			callback: async () => {
				await this.navigator.navigateNext();
				this.updateStatusBar();
			}
		});

		// Navigate to previous in sequence
		this.addCommand({
			id: 'navigate-previous',
			name: 'Navigate to previous in sequence',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'ArrowLeft' }],
			callback: async () => {
				await this.navigator.navigatePrevious();
				this.updateStatusBar();
			}
		});

		// Show sequence overview
		this.addCommand({
			id: 'show-sequence-overview',
			name: 'Show sequence overview',
			callback: () => {
				const info = this.navigator.getSequenceInfo();
				if (info) {
					const fileList = info.files.map((f, i) => 
						`${i === info.currentIndex ? '→ ' : '  '}${i + 1}. ${f.basename}`
					).join('\n');
					console.log(`Sequence: ${info.pattern}\n${fileList}`);
					// TODO: Create modal for better display
				}
			}
		});

		// Show link statistics
		this.addCommand({
			id: 'show-link-stats',
			name: 'Show link statistics',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const stats = this.linkManager.getLinkStats(activeFile);
					new LinkStatsModal(this.app, activeFile, stats).open();
				} else {
					new Notice('No active file');
				}
			}
		});

		// Find orphaned notes
		this.addCommand({
			id: 'find-orphaned',
			name: 'Find orphaned notes',
			callback: () => {
				const orphaned = this.linkManager.getOrphanedNotes();
				new OrphanedNotesModal(this.app, orphaned).open();
			}
		});

		// Find path between notes
		this.addCommand({
			id: 'find-path',
			name: 'Find path between notes',
			callback: () => {
				// TODO: Implement path finder
				console.log('Find path between notes');
			}
		});

		// Insert sequence links
		this.addCommand({
			id: 'insert-sequence-links',
			name: 'Insert sequence navigation links',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					await this.linkInserter.insertSequenceLinks(activeFile);
				}
			}
		});

		// Update all sequence links
		this.addCommand({
			id: 'update-all-sequence-links',
			name: 'Update all sequence links',
			callback: async () => {
				await this.linkInserter.updateAllSequenceLinks();
			}
		});

		// Validate all links
		this.addCommand({
			id: 'validate-all-links',
			name: 'Validate all links',
			callback: async () => {
				new Notice('Validating all links...');
				const result = await this.linkManager.validateAllLinks();
				new ValidationResultsModal(this.app, result).open();
			}
		});

		// Validate current file links
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
				const unresolved = links.filter(l => !l.isResolved);
				
				if (unresolved.length > 0) {
					new Notice(`Found ${unresolved.length} unresolved link(s)`);
				} else {
					new Notice('All links are valid!');
				}
			}
		});

		// Find hub pages
		this.addCommand({
			id: 'find-hub-pages',
			name: 'Find hub pages',
			callback: () => {
				const hubs = this.linkManager.getHubPages(10);
				if (hubs.length === 0) {
					new Notice('No hub pages found');
					return;
				}

				const message = hubs.slice(0, 5).map((h, i) => 
					`${i + 1}. ${h.file.basename} (${h.linkCount} links)`
				).join('\n');
				console.log('Top Hub Pages:\n' + message);
				new Notice(`Found ${hubs.length} hub pages (see console)`);
			}
		});

		// Export link statistics to CSV
		this.addCommand({
			id: 'export-stats-csv',
			name: 'Export link statistics to CSV',
			callback: () => {
				const csv = this.linkManager.exportStatsToCSV();
				navigator.clipboard.writeText(csv);
				new Notice('Link statistics copied to clipboard as CSV');
			}
		});

		// Export link statistics to JSON
		this.addCommand({
			id: 'export-stats-json',
			name: 'Export link statistics to JSON',
			callback: () => {
				const json = this.linkManager.exportStatsToJSON();
				navigator.clipboard.writeText(json);
				new Notice('Link statistics copied to clipboard as JSON');
			}
		});

		// Batch link replacement
		this.addCommand({
			id: 'batch-replace-link',
			name: 'Batch replace link',
			callback: () => {
				const modal = new BatchOperationModal(
					this.app,
					'Batch Link Replacement',
					'Replace all instances of a link across the vault',
					async (oldLink, newLink, dryRun) => {
						if (dryRun) {
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
						} else {
							const result = await this.batchOps.batchReplaceLink(oldLink, newLink, false);
							new Notice(`Replaced ${result.success} link(s) in ${result.success} file(s)`);
						}
					}
				);
				modal.open();
			}
		});

		// Undo last batch operation
		this.addCommand({
			id: 'undo-batch-operation',
			name: 'Undo last batch operation',
			callback: async () => {
				await this.batchOps.undoLastOperation();
			}
		});

		// Show outgoing links with preview
		this.addCommand({
			id: 'show-outgoing-links',
			name: 'Show outgoing links with preview',
			callback: async () => {
				const previews = await this.linkPreview.filterLinksInView('outgoing');
				if (previews.length === 0) {
					new Notice('No outgoing links found');
					return;
				}
				new LinkPreviewModal(this.app, previews, 'outgoing').open();
			}
		});

		// Show incoming links with preview
		this.addCommand({
			id: 'show-incoming-links',
			name: 'Show incoming links with preview',
			callback: async () => {
				const previews = await this.linkPreview.filterLinksInView('incoming');
				if (previews.length === 0) {
					new Notice('No incoming links found');
					return;
				}
				new LinkPreviewModal(this.app, previews, 'incoming').open();
			}
		});

		// Show unresolved links with preview
		this.addCommand({
			id: 'show-unresolved-links',
			name: 'Show unresolved links with preview',
			callback: async () => {
				const previews = await this.linkPreview.filterLinksInView('unresolved');
				if (previews.length === 0) {
					new Notice('No unresolved links found');
					return;
				}
				new LinkPreviewModal(this.app, previews, 'unresolved').open();
			}
		});
	}

	private initializeStatusBar() {
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.addClass('linkweaver-status-bar');
		this.updateStatusBar();

		// Update on click
		this.statusBarItem.addEventListener('click', () => {
			const info = this.navigator.getSequenceInfo();
			if (info) {
				const fileList = info.files.map((f, i) => 
					`${i === info.currentIndex ? '→ ' : '  '}${i + 1}. ${f.basename}`
				).join('\n');
				console.log(`Sequence: ${info.pattern}\n${fileList}`);
				// TODO: Show modal instead of console
			}
		});
	}

	private updateStatusBar() {
		if (!this.statusBarItem || !this.settings.showSequenceInStatusBar) {
			return;
		}

		const info = this.navigator.getSequenceInfo();
		if (info) {
			const position = `${info.currentIndex + 1}/${info.files.length}`;
			this.statusBarItem.setText(`📝 ${position} | ${info.pattern}`);
			this.statusBarItem.style.display = 'block';
		} else {
			this.statusBarItem.style.display = 'none';
		}
	}

	private registerEventHandlers() {
		// Update status bar when active file changes
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				this.updateStatusBar();
			})
		);

		// Update status bar when file is opened
		this.registerEvent(
			this.app.workspace.on('file-open', () => {
				this.updateStatusBar();
			})
		);

		// Clear cache when files are renamed/deleted
		this.registerEvent(
			this.app.vault.on('rename', async (file, oldPath) => {
				this.detector.invalidateFile(oldPath);
				if ('path' in file) {
					this.detector.invalidateFile(file.path);
					
					// Auto-update links if enabled
					if (this.settings.autoUpdateLinks && file instanceof TFile) {
						await this.batchOps.updateLinksOnRename(oldPath, file.path);
					}
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

		// Clear cache when files are created
		this.registerEvent(
			this.app.vault.on('create', () => {
				this.detector.clearCache();
				this.updateStatusBar();
			})
		);

		// Validate links on save if enabled
		if (this.settings.validateLinksOnSave) {
			this.registerEvent(
				this.app.vault.on('modify', async (file) => {
					if (file instanceof TFile && file.extension === 'md') {
						const links = await this.linkManager.validateFileLinks(file);
						const unresolved = links.filter(l => !l.isResolved);
						
						if (unresolved.length > 0) {
							new Notice(`${file.basename}: ${unresolved.length} unresolved link(s)`);
						}
					}
				})
			);
		}
	}
}
