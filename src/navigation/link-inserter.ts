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

	async insertSequenceLinks(file: TFile): Promise<boolean> {
		if (!this.settings.enableSequentialNav) {
			new Notice('Sequential navigation is disabled');
			return false;
		}

		const sequence = this.detector.detectSequence(file);
		if (!sequence) {
			new Notice('No sequence detected for this file');
			return false;
		}

		const previousFile = this.getPreviousFile(sequence);
		const nextFile = this.getNextFile(sequence);
		if (!previousFile && !nextFile) {
			new Notice('No previous or next file in sequence');
			return false;
		}

		await this.updateFileLinks(file, previousFile, nextFile);
		new Notice('Sequence links added');
		return true;
	}

	async updateAllSequenceLinks(): Promise<boolean> {
		if (!this.settings.enableSequentialNav) {
			new Notice('Sequential navigation is disabled');
			return false;
		}

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

		let updatedCount = 0;
		for (let fileIndex = 0; fileIndex < sequence.files.length; fileIndex++) {
			const file = sequence.files[fileIndex];
			const previousFile = this.getSequenceNeighbor(sequence.files, fileIndex, -1);
			const nextFile = this.getSequenceNeighbor(sequence.files, fileIndex, 1);

			await this.updateFileLinks(file, previousFile, nextFile);
			updatedCount++;
		}

		new Notice(`Updated links in ${updatedCount} files`);
		return true;
	}

	updateSettings(settings: LinkWeaverSettings): void {
		this.settings = settings;
	}

	private async updateFileLinks(file: TFile, previousFile: TFile | null, nextFile: TFile | null): Promise<void> {
		if (!previousFile && !nextFile) {
			return;
		}

		const content = await this.app.vault.read(file);
		const cleanedContent = this.removeExistingLinks(content);
		const navLinks = this.generateNavigationLinks(previousFile, nextFile);
		const newContent = `${cleanedContent.trim()}\n\n---\n\n${navLinks}`;

		await this.app.vault.modify(file, newContent);
	}

	private removeExistingLinks(content: string): string {
		const lines = content.split('\n');

		for (let lineIndex = lines.length - 1; lineIndex >= 0; lineIndex--) {
			const line = lines[lineIndex].trim();
			if (!this.isHorizontalRule(line)) {
				continue;
			}

			const remainingContent = lines.slice(lineIndex + 1).join('\n');
			if (this.looksLikeNavigationSection(remainingContent)) {
				return lines.slice(0, lineIndex).join('\n');
			}
		}

		return content;
	}

	private looksLikeNavigationSection(content: string): boolean {
		const trimmed = content.trim();
		return /\[\[.+?\]\]/.test(trimmed)
			&& (trimmed.includes('<-') || trimmed.includes('->') || trimmed.includes('Previous') || trimmed.includes('Next') || trimmed.includes('|'));
	}

	private generateNavigationLinks(previousFile: TFile | null, nextFile: TFile | null): string {
		const parts: string[] = [];

		if (previousFile) {
			parts.push(`<- [[${previousFile.basename}]]`);
		}

		if (nextFile) {
			parts.push(`[[${nextFile.basename}]] ->`);
		}

		return parts.join(' | ');
	}

	private getPreviousFile(sequence: SequenceInfo): TFile | null {
		return this.getSequenceNeighbor(sequence.files, sequence.currentIndex, -1);
	}

	private getNextFile(sequence: SequenceInfo): TFile | null {
		return this.getSequenceNeighbor(sequence.files, sequence.currentIndex, 1);
	}

	private getSequenceNeighbor(files: TFile[], currentIndex: number, direction: -1 | 1): TFile | null {
		const nextIndex = currentIndex + direction;
		if (nextIndex >= 0 && nextIndex < files.length) {
			return files[nextIndex];
		}

		if (!this.settings.circularNavigation || files.length <= 1) {
			return null;
		}

		return direction === -1 ? files[files.length - 1] : files[0];
	}

	private isHorizontalRule(line: string): boolean {
		return line === '---' || line === '***' || line === '___';
	}
}
