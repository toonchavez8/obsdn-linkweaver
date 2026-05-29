import { App, TFile, Notice } from 'obsidian';

export interface BatchOperation {
	type: 'replace' | 'rename' | 'delete';
	oldLink: string;
	newLink?: string;
	files: TFile[];
}

export interface BatchResult {
	success: number;
	failed: number;
	operations: Array<{
		file: TFile;
		oldContent: string;
		newContent: string;
		success: boolean;
	}>;
}

interface UndoEntry {
	timestamp: number;
	operations: Array<{
		file: TFile;
		oldContent: string;
		newContent: string;
	}>;
}

export class BatchOperations {
	private readonly app: App;
	private undoStack: UndoEntry[] = [];

	constructor(app: App) {
		this.app = app;
	}

	async batchReplaceLink(oldLink: string, newLink: string, dryRun: boolean = false): Promise<BatchResult> {
		const result: BatchResult = {
			success: 0,
			failed: 0,
			operations: []
		};
		const undoOperations: UndoEntry['operations'] = [];

		for (const file of this.app.vault.getMarkdownFiles()) {
			try {
				const content = await this.app.vault.read(file);
				const newContent = this.replaceLinks(content, oldLink, newLink);

				if (content === newContent) {
					continue;
				}

				if (!dryRun) {
					await this.app.vault.modify(file, newContent);
					undoOperations.push({ file, oldContent: content, newContent });
				}

				result.operations.push({ file, oldContent: content, newContent, success: true });
				result.success++;
			} catch (error) {
				result.failed++;
				console.error(`batchReplaceLink failed for ${file.path}:`, error);
				result.operations.push({ file, oldContent: '', newContent: '', success: false });
			}
		}

		if (!dryRun && undoOperations.length > 0) {
			this.rememberUndoEntry(undoOperations);
		}

		return result;
	}

	async renameAllInstances(oldPath: string, newPath: string, dryRun: boolean = false): Promise<BatchResult> {
		return this.batchReplaceLink(
			this.getBaseName(oldPath),
			this.getBaseName(newPath),
			dryRun
		);
	}

	async updateLinksOnRename(oldPath: string, newPath: string): Promise<void> {
		const result = await this.renameAllInstances(oldPath, newPath, false);
		if (result.success > 0) {
			new Notice(`Updated ${result.success} link(s) to ${this.getBaseName(newPath)}`);
		}
	}

	async undoLastOperation(): Promise<boolean> {
		if (this.undoStack.length === 0) {
			new Notice('No operations to undo');
			return false;
		}

		const lastOperation = this.undoStack.pop();
		if (!lastOperation) {
			return false;
		}

		try {
			for (const operation of lastOperation.operations) {
				await this.app.vault.modify(operation.file, operation.oldContent);
			}

			new Notice(`Undid ${lastOperation.operations.length} operation(s)`);
			return true;
		} catch (error) {
			console.error('Failed to undo batch operation', error);
			const message = error instanceof Error ? error.message : String(error);
			new Notice(`Failed to undo operation: ${message}`);
			return false;
		}
	}

	async previewChanges(oldLink: string, newLink: string): Promise<Array<{ file: TFile; changes: number }>> {
		const result = await this.batchReplaceLink(oldLink, newLink, true);

		return result.operations
			.filter(operation => operation.success)
			.map(operation => ({
				file: operation.file,
				changes: this.countLinkOccurrences(operation.oldContent, oldLink)
			}));
	}

	getUndoHistory(): Array<{ timestamp: Date; operationCount: number }> {
		return this.undoStack.map(undoEntry => ({
			timestamp: new Date(undoEntry.timestamp),
			operationCount: undoEntry.operations.length
		}));
	}

	clearUndoHistory(): void {
		this.undoStack = [];
	}

	private replaceLinks(content: string, oldLink: string, newLink: string): string {
		const wikiLinkRegex = new RegExp(String.raw`\[\[${this.escapeRegex(oldLink)}(\|[^\]]+)?\]\]`, 'g');
		const markdownLinkRegex = new RegExp(String.raw`\[([^\]]+)\]\(${this.escapeRegex(oldLink)}\)`, 'g');

		return content
			.replace(wikiLinkRegex, `[[${newLink}$1]]`)
			.replace(markdownLinkRegex, `[$1](${newLink})`);
	}

	private countLinkOccurrences(content: string, link: string): number {
		let count = 0;
		const wikiLinkRegex = new RegExp(String.raw`\[\[${this.escapeRegex(link)}(\|[^\]]+)?\]\]`, 'g');
		const markdownLinkRegex = new RegExp(String.raw`\[([^\]]+)\]\(${this.escapeRegex(link)}\)`, 'g');

		while (wikiLinkRegex.exec(content) !== null) {
			count++;
		}

		while (markdownLinkRegex.exec(content) !== null) {
			count++;
		}

		return count;
	}

	private rememberUndoEntry(operations: UndoEntry['operations']): void {
		this.undoStack.push({ timestamp: Date.now(), operations });
		if (this.undoStack.length > 10) {
			this.undoStack.shift();
		}
	}

	private escapeRegex(value: string): string {
		return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\\$&`);
	}

	private getBaseName(path: string): string {
		const name = path.split('/').pop() || path;
		return name.replace(/\.md$/, '');
	}
}
