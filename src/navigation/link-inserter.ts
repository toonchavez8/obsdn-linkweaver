import { App, TFile, Notice } from 'obsidian';
import { SequenceDetector, SequenceInfo } from './sequence-detector';
import { LinkWeaverSettings } from '../settings';

export class LinkInserter {
	private app: App;
	private detector: SequenceDetector;
	private settings: LinkWeaverSettings;

	constructor(app: App, detector: SequenceDetector, settings: LinkWeaverSettings) {
		this.app = app;
		this.detector = detector;
		this.settings = settings;
	}

	/**
	 * Insert or update sequence navigation links at the end of the file
	 */
	async insertSequenceLinks(file: TFile): Promise<boolean> {
		const sequence = this.detector.detectSequence(file);
		if (!sequence) {
			new Notice('No sequence detected for this file');
			return false;
		}

		// Get previous and next files
		const prevFile = this.getPreviousFile(sequence);
		const nextFile = this.getNextFile(sequence);

		if (!prevFile && !nextFile) {
			new Notice('No previous or next file in sequence');
			return false;
		}

		// Read current file content
		const content = await this.app.vault.read(file);

		// Remove existing navigation links if any
		const cleanedContent = this.removeExistingLinks(content);

		// Generate new navigation links
		const navLinks = this.generateNavigationLinks(prevFile, nextFile);

		// Add links at the end
		const newContent = cleanedContent.trim() + '\n\n---\n\n' + navLinks;

		// Write back to file
		await this.app.vault.modify(file, newContent);

		new Notice('Sequence links added');
		return true;
	}

	/**
	 * Update sequence links for all files in the current sequence
	 */
	async updateAllSequenceLinks(): Promise<boolean> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('No active file');
			return false;
		}

		const sequence = this.detector.detectSequence(activeFile);
		if (!sequence) {
			new Notice('No sequence detected');
			return false;
		}

		let updated = 0;
		for (let i = 0; i < sequence.files.length; i++) {
			const file = sequence.files[i];
			const prevFile = i > 0 ? sequence.files[i - 1] : null;
			const nextFile = i < sequence.files.length - 1 ? sequence.files[i + 1] : null;

			if (this.settings.circularNavigation) {
				// Handle circular navigation
				if (!prevFile && sequence.files.length > 1) {
					// First file, link to last
					const prev = sequence.files[sequence.files.length - 1];
					await this.updateFileLinks(file, prev, nextFile);
				} else if (!nextFile && sequence.files.length > 1) {
					// Last file, link to first
					const next = sequence.files[0];
					await this.updateFileLinks(file, prevFile, next);
				} else {
					await this.updateFileLinks(file, prevFile, nextFile);
				}
			} else {
				await this.updateFileLinks(file, prevFile, nextFile);
			}
			updated++;
		}

		new Notice(`Updated links in ${updated} files`);
		return true;
	}

	/**
	 * Update links for a specific file
	 */
	private async updateFileLinks(file: TFile, prevFile: TFile | null, nextFile: TFile | null): Promise<void> {
		if (!prevFile && !nextFile) return;

		const content = await this.app.vault.read(file);
		const cleanedContent = this.removeExistingLinks(content);
		const navLinks = this.generateNavigationLinks(prevFile, nextFile);
		const newContent = cleanedContent.trim() + '\n\n---\n\n' + navLinks;

		await this.app.vault.modify(file, newContent);
	}

	/**
	 * Remove existing navigation links from content
	 */
	private removeExistingLinks(content: string): string {
		// Remove the navigation section (everything after the last ---)
		const lines = content.split('\n');
		let lastHrIndex = -1;

		// Find the last horizontal rule that marks our navigation section
		for (let i = lines.length - 1; i >= 0; i--) {
			const line = lines[i].trim();
			if (line === '---' || line === '***' || line === '___') {
				// Check if the lines after this look like navigation links
				const remaining = lines.slice(i + 1).join('\n');
				if (this.looksLikeNavigationSection(remaining)) {
					lastHrIndex = i;
					break;
				}
			}
		}

		if (lastHrIndex >= 0) {
			return lines.slice(0, lastHrIndex).join('\n');
		}

		return content;
	}

	/**
	 * Check if content looks like a navigation section
	 */
	private looksLikeNavigationSection(content: string): boolean {
		const trimmed = content.trim();
		// Check for wiki-style links
		return /\[\[.+?\]\]/.test(trimmed) && 
			   (trimmed.includes('←') || trimmed.includes('→') || 
			    trimmed.includes('Previous') || trimmed.includes('Next') ||
			    trimmed.includes('|'));
	}

	/**
	 * Generate navigation links text
	 */
	private generateNavigationLinks(prevFile: TFile | null, nextFile: TFile | null): string {
		const parts: string[] = [];

		if (prevFile) {
			const prevName = prevFile.basename;
			parts.push(`← [[${prevName}]]`);
		}

		if (nextFile) {
			const nextName = nextFile.basename;
			parts.push(`[[${nextName}]] →`);
		}

		return parts.join(' | ');
	}

	/**
	 * Get previous file in sequence
	 */
	private getPreviousFile(sequence: SequenceInfo): TFile | null {
		const currentIndex = sequence.currentIndex;
		
		if (currentIndex > 0) {
			return sequence.files[currentIndex - 1];
		}

		if (this.settings.circularNavigation && sequence.files.length > 1) {
			return sequence.files[sequence.files.length - 1];
		}

		return null;
	}

	/**
	 * Get next file in sequence
	 */
	private getNextFile(sequence: SequenceInfo): TFile | null {
		const currentIndex = sequence.currentIndex;

		if (currentIndex < sequence.files.length - 1) {
			return sequence.files[currentIndex + 1];
		}

		if (this.settings.circularNavigation && sequence.files.length > 1) {
			return sequence.files[0];
		}

		return null;
	}

	/**
	 * Update settings
	 */
	updateSettings(settings: LinkWeaverSettings): void {
		this.settings = settings;
	}
}
