import { Plugin } from 'obsidian';
import { LinkWeaverSettings, DEFAULT_SETTINGS } from './settings';
import { LinkWeaverSettingTab } from './ui/settings-tab';

export default class LinkWeaverPlugin extends Plugin {
	settings: LinkWeaverSettings;

	async onload() {
		console.log('Loading LinkWeaver plugin');

		// Load settings
		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new LinkWeaverSettingTab(this.app, this));

		// Register commands
		this.registerCommands();

		// Initialize status bar if enabled
		if (this.settings.showSequenceInStatusBar) {
			this.initializeStatusBar();
		}
	}

	onunload() {
		console.log('Unloading LinkWeaver plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private registerCommands() {
		// Navigate to next in sequence
		this.addCommand({
			id: 'navigate-next',
			name: 'Navigate to next in sequence',
			callback: () => {
				// TODO: Implement navigation logic
				console.log('Navigate to next');
			}
		});

		// Navigate to previous in sequence
		this.addCommand({
			id: 'navigate-previous',
			name: 'Navigate to previous in sequence',
			callback: () => {
				// TODO: Implement navigation logic
				console.log('Navigate to previous');
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
	}

	private initializeStatusBar() {
		// TODO: Implement status bar
		const statusBarItem = this.addStatusBarItem();
		statusBarItem.setText('LinkWeaver ready');
	}
}
