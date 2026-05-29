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

	async navigateNext(): Promise<boolean> {
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
			new Notice('No sequence detected for this file');
			return false;
		}

		const nextIndex = this.getNextIndex(sequence);
		if (nextIndex === -1) {
			new Notice('Already at the end of the sequence');
			return false;
		}

		await this.openFile(sequence.files[nextIndex]);
		this.showSequenceNotice(sequence, nextIndex);
		return true;
	}

	async navigatePrevious(): Promise<boolean> {
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
			new Notice('No sequence detected for this file');
			return false;
		}

		const previousIndex = this.getPreviousIndex(sequence);
		if (previousIndex === -1) {
			new Notice('Already at the beginning of the sequence');
			return false;
		}

		await this.openFile(sequence.files[previousIndex]);
		this.showSequenceNotice(sequence, previousIndex);
		return true;
	}

	getSequenceInfo(): SequenceInfo | null {
		if (!this.settings.enableSequentialNav) {
			return null;
		}

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			return null;
		}

		return this.detector.detectSequence(activeFile);
	}

	async navigateToIndex(index: number): Promise<boolean> {
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
			new Notice('No sequence detected for this file');
			return false;
		}

		if (index < 0 || index >= sequence.files.length) {
			new Notice('Invalid sequence index');
			return false;
		}

		await this.openFile(sequence.files[index]);
		this.showSequenceNotice(sequence, index);
		return true;
	}

	updateSettings(settings: LinkWeaverSettings): void {
		this.settings = settings;
	}

	private getNextIndex(sequence: SequenceInfo): number {
		const nextIndex = sequence.currentIndex + 1;

		if (nextIndex < sequence.files.length) {
			return nextIndex;
		}

		return this.settings.circularNavigation ? 0 : -1;
	}

	private getPreviousIndex(sequence: SequenceInfo): number {
		const previousIndex = sequence.currentIndex - 1;

		if (previousIndex >= 0) {
			return previousIndex;
		}

		return this.settings.circularNavigation ? sequence.files.length - 1 : -1;
	}

	private async openFile(file: TFile): Promise<void> {
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(file);
	}

	private showSequenceNotice(sequence: SequenceInfo, newIndex: number): void {
		if (!this.settings.showVisualIndicators) {
			return;
		}

		const position = `${newIndex + 1} of ${sequence.files.length}`;
		new Notice(`LinkWeaver ${position} | ${sequence.pattern}`, 2000);
	}
}
