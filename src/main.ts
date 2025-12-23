import { Plugin } from 'obsidian';
import { LinkWeaverSettings, DEFAULT_SETTINGS } from './settings';
import { LinkWeaverSettingTab } from './ui/settings-tab';
import { SequenceDetector } from './navigation/sequence-detector';
import { Navigator } from './navigation/navigator';
import { LinkInserter } from './navigation/link-inserter';

export default class LinkWeaverPlugin extends Plugin {
	settings: LinkWeaverSettings;
	detector: SequenceDetector;
	navigator: Navigator;
	linkInserter: LinkInserter;
	statusBarItem: HTMLElement | null = null;

	async onload() {
		console.log('Loading LinkWeaver plugin');

		// Load settings
		await this.loadSettings();

		// Initialize sequence detector, navigator, and link inserter
		this.detector = new SequenceDetector(this.app.vault, this.settings.customPatterns);
		this.navigator = new Navigator(this.app, this.detector, this.settings);
		this.linkInserter = new LinkInserter(this.app, this.detector, this.settings);

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
		// Update detector, navigator, and link inserter with new settings
		if (this.detector) {
			this.detector.updatePatterns(this.settings.customPatterns);
		}
		if (this.navigator) {
			this.navigator.updateSettings(this.settings);
		}
		if (this.linkInserter) {
			this.linkInserter.updateSettings(this.settings);
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
				// TODO: Implement link statistics
				console.log('Show link statistics');
			}
		});

		// Find orphaned notes
		this.addCommand({
			id: 'find-orphaned',
			name: 'Find orphaned notes',
			callback: () => {
				// TODO: Implement orphaned notes finder
				console.log('Find orphaned notes');
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
			this.app.vault.on('rename', (file, oldPath) => {
				this.detector.invalidateFile(oldPath);
				if ('path' in file) {
					this.detector.invalidateFile(file.path);
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
	}
}
