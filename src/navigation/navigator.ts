import { App, TFile, Notice } from 'obsidian';
import { SequenceDetector, SequenceInfo } from './sequence-detector';
import { LinkWeaverSettings } from '../settings';

export class Navigator {
	private app: App;
	private detector: SequenceDetector;
	private settings: LinkWeaverSettings;

	constructor(app: App, detector: SequenceDetector, settings: LinkWeaverSettings) {
		this.app = app;
		this.detector = detector;
		this.settings = settings;
	}

	/**
	 * Navigate to the next file in the sequence
	 */
	async navigateNext(): Promise<boolean> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('No active file');
			return false;
		}

		const sequence = this.detector.detectSequence(activeFile);
		if (!sequence) {
			new Notice('No sequence detected for this file');
			return false;
		}

		const nextIndex = this.getNextIndex(sequence);
		if (nextIndex === -1) {
			new Notice('Already at the end of the sequence');
			return false;
		}

		const nextFile = sequence.files[nextIndex];
		await this.openFile(nextFile);
		this.showSequenceNotice(sequence, nextIndex);
		
		return true;
	}

	/**
	 * Navigate to the previous file in the sequence
	 */
	async navigatePrevious(): Promise<boolean> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('No active file');
			return false;
		}

		const sequence = this.detector.detectSequence(activeFile);
		if (!sequence) {
			new Notice('No sequence detected for this file');
			return false;
		}

		const prevIndex = this.getPreviousIndex(sequence);
		if (prevIndex === -1) {
			new Notice('Already at the beginning of the sequence');
			return false;
		}

		const prevFile = sequence.files[prevIndex];
		await this.openFile(prevFile);
		this.showSequenceNotice(sequence, prevIndex);
		
		return true;
	}

	/**
	 * Get the next index in the sequence
	 */
	private getNextIndex(sequence: SequenceInfo): number {
		const currentIndex = sequence.currentIndex;
		const nextIndex = currentIndex + 1;

		// Check if we're at the end
		if (nextIndex >= sequence.files.length) {
			if (this.settings.circularNavigation) {
				return 0; // Loop back to start
			}
			return -1; // No next file
		}

		return nextIndex;
	}

	/**
	 * Get the previous index in the sequence
	 */
	private getPreviousIndex(sequence: SequenceInfo): number {
		const currentIndex = sequence.currentIndex;
		const prevIndex = currentIndex - 1;

		// Check if we're at the beginning
		if (prevIndex < 0) {
			if (this.settings.circularNavigation) {
				return sequence.files.length - 1; // Loop to end
			}
			return -1; // No previous file
		}

		return prevIndex;
	}

	/**
	 * Open a file in Obsidian
	 */
	private async openFile(file: TFile): Promise<void> {
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(file);
	}

	/**
	 * Show a notice with sequence information
	 */
	private showSequenceNotice(sequence: SequenceInfo, newIndex: number): void {
		if (!this.settings.showVisualIndicators) {
			return;
		}

		const position = `${newIndex + 1} of ${sequence.files.length}`;
		const pattern = sequence.pattern;
		new Notice(`📝 ${position} | ${pattern}`, 2000);
	}

	/**
	 * Get sequence information for the current file
	 */
	getSequenceInfo(): SequenceInfo | null {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			return null;
		}

		return this.detector.detectSequence(activeFile);
	}

	/**
	 * Navigate to a specific index in the sequence
	 */
	async navigateToIndex(index: number): Promise<boolean> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('No active file');
			return false;
		}

		const sequence = this.detector.detectSequence(activeFile);
		if (!sequence) {
			new Notice('No sequence detected for this file');
			return false;
		}

		if (index < 0 || index >= sequence.files.length) {
			new Notice('Invalid sequence index');
			return false;
		}

		const file = sequence.files[index];
		await this.openFile(file);
		this.showSequenceNotice(sequence, index);
		
		return true;
	}

	/**
	 * Update settings
	 */
	updateSettings(settings: LinkWeaverSettings): void {
		this.settings = settings;
	}
}
