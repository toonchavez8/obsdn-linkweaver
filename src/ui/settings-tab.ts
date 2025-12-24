import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import LinkWeaverPlugin from '../main';

export class LinkWeaverSettingTab extends PluginSettingTab {
	plugin: LinkWeaverPlugin;

	constructor(app: App, plugin: LinkWeaverPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'LinkWeaver Settings' });

		// Sequential Navigation Section
		containerEl.createEl('h3', { text: 'Sequential Navigation' });

		new Setting(containerEl)
			.setName('Enable sequential navigation')
			.setDesc('Enable automatic detection of note sequences')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableSequentialNav)
				.onChange(async (value) => {
					this.plugin.settings.enableSequentialNav = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Circular navigation')
			.setDesc('Loop back to start when reaching the end of a sequence')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.circularNavigation)
				.onChange(async (value) => {
					this.plugin.settings.circularNavigation = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show sequence in status bar')
			.setDesc('Display current position in sequence at the bottom of the window')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showSequenceInStatusBar)
				.onChange(async (value) => {
					this.plugin.settings.showSequenceInStatusBar = value;
					await this.plugin.saveSettings();
				}));

		// Link Management Section
		containerEl.createEl('h3', { text: 'Link Management' });

		new Setting(containerEl)
			.setName('Auto-update links')
			.setDesc('Automatically update links when notes are renamed')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoUpdateLinks)
				.onChange(async (value) => {
					this.plugin.settings.autoUpdateLinks = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Validate links on save')
			.setDesc('Check for broken links when saving files')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.validateLinksOnSave)
				.onChange(async (value) => {
					this.plugin.settings.validateLinksOnSave = value;
					await this.plugin.saveSettings();
					// Re-register event handlers with new settings
					if (value) {
						const notice = new Notice('Link validation on save enabled. Reload plugin to activate.', 3000)
						notice.hide();
					}
				}));

		new Setting(containerEl)
			.setName('Link preview length')
			.setDesc('Number of characters to show in link previews')
			.addText(text => text
				.setPlaceholder('200')
				.setValue(String(this.plugin.settings.linkPreviewLength))
				.onChange(async (value) => {
					const num = Number.parseInt(value);
					if (!Number.isNaN(num) && num > 0) {
						this.plugin.settings.linkPreviewLength = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Auto-insert sequence links')
			.setDesc('Automatically insert navigation links when creating files in a sequence')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoInsertSequenceLinks)
				.onChange(async (value) => {
					this.plugin.settings.autoInsertSequenceLinks = value;
					await this.plugin.saveSettings();
				}));

		// Discovery Section
		containerEl.createEl('h3', { text: 'Discovery' });

		new Setting(containerEl)
			.setName('Max path depth')
			.setDesc('Maximum depth for path finding between notes')
			.addText(text => text
				.setPlaceholder('5')
				.setValue(String(this.plugin.settings.maxPathDepth))
				.onChange(async (value) => {
					const num = Number.parseInt(value);
					if (!Number.isNaN(num) && num > 0) {
						this.plugin.settings.maxPathDepth = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Similarity threshold')
			.setDesc('Minimum similarity score (0-1) for related note detection')
			.addText(text => text
				.setPlaceholder('0.5')
				.setValue(String(this.plugin.settings.similarityThreshold))
				.onChange(async (value) => {
					const num = Number.parseFloat(value);
					if (!Number.isNaN(num) && num >= 0 && num <= 1) {
						this.plugin.settings.similarityThreshold = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Exclude folders')
			.setDesc('Comma-separated list of folder paths to exclude from discovery')
			.addText(text => text
				.setPlaceholder('templates, archive')
				.setValue(this.plugin.settings.excludeFolders.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.excludeFolders = value
						.split(',')
						.map(s => s.trim())
						.filter(s => s.length > 0);
					await this.plugin.saveSettings();
				}));
	}
}
