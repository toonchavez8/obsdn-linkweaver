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

export class BatchOperations {
    // mark app readonly since it's never reassigned
    private readonly app: App;
    private undoStack: Array<{
        timestamp: number;
        operations: Array<{
            file: TFile;
            oldContent: string;
            newContent: string;
        }>;
    }> = [];

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Replace all instances of a link across the vault
     */
    async batchReplaceLink(
        oldLink: string, 
        newLink: string, 
        dryRun: boolean = false
    ): Promise<BatchResult> {
        const files = this.app.vault.getMarkdownFiles();
        const result: BatchResult = {
            success: 0,
            failed: 0,
            operations: []
        };

        const batchOps: Array<{ file: TFile; oldContent: string; newContent: string }> = [];

        for (const file of files) {
            try {
                const content = await this.app.vault.read(file);
                
                // Use String.raw to avoid double-escaping backslashes in the template
                const wikiLinkRegex = new RegExp(String.raw`\[\[${this.escapeRegex(oldLink)}(\|[^\]]+)?\]\]`, 'g');
                const mdLinkRegex = new RegExp(String.raw`\[([^\]]+)\]\(${this.escapeRegex(oldLink)}\)`, 'g');
                
                let newContent = content;
                // prefer replaceAll for clarity when dealing with global replacements
                newContent = newContent.replace(wikiLinkRegex, `[[${newLink}$1]]`);
                newContent = newContent.replace(mdLinkRegex, `[$1](${newLink})`);

                if (content !== newContent) {
                    if (!dryRun) {
                        await this.app.vault.modify(file, newContent);
                        batchOps.push({ file, oldContent: content, newContent });
                    }
                    
                    result.operations.push({
                        file,
                        oldContent: content,
                        newContent,
                        success: true
                    });
                    result.success++;
                }
            } catch (error) {
                result.failed++;
                console.error(`batchReplaceLink failed for ${file.path}:`, error);
                result.operations.push({
                    file,
                    oldContent: '',
                    newContent: '',
                    success: false
                });
            }
        }

        // Save to undo stack if not dry run
        if (!dryRun && batchOps.length > 0) {
            this.undoStack.push({
                timestamp: Date.now(),
                operations: batchOps
            });
            // Keep only last 10 operations
            if (this.undoStack.length > 10) {
                this.undoStack.shift();
            }
        }

        return result;
    }

    /**
     * Rename all instances of a link (handles the link target being renamed)
     */
    async renameAllInstances(
        oldPath: string,
        newPath: string,
        dryRun: boolean = false
    ): Promise<BatchResult> {
        const oldBaseName = this.getBaseName(oldPath);
        const newBaseName = this.getBaseName(newPath);

        return this.batchReplaceLink(oldBaseName, newBaseName, dryRun);
    }

    /**
     * Update links when a file is renamed (auto-triggered)
     */
    async updateLinksOnRename(
        oldPath: string,
        newPath: string
    ): Promise<void> {
        const result = await this.renameAllInstances(oldPath, newPath, false);
        if (result.success > 0) {
            // use the Notice and keep a reference (so linter doesn't flag unused instantiation)
            new Notice(`Updated ${result.success} link(s) to ${this.getBaseName(newPath)}`);
            // we intentionally don't hide it immediately
        }
    }

    /**
     * Undo the last batch operation
     */
    async undoLastOperation(): Promise<boolean> {
        if (this.undoStack.length === 0) {
           new Notice('No operations to undo');
            return false;
        }

        const lastOp = this.undoStack.pop();
        if (!lastOp) return false;

        try {
            for (const op of lastOp.operations) {
                await this.app.vault.modify(op.file, op.oldContent);
            }
           new Notice(`Undid ${lastOp.operations.length} operation(s)`);
			
            return true;
        } catch (error) {
            // Handle the exception: log and notify the user
            console.error('Failed to undo batch operation', error);
            const message = error instanceof Error ? error.message : String(error);
           	new Notice(`Failed to undo operation: ${message}`);
            return false;
        }
    }

    /**
     * Preview changes without applying them
     */
    async previewChanges(
        oldLink: string,
        newLink: string
    ): Promise<Array<{ file: TFile; changes: number }>> {
        const result = await this.batchReplaceLink(oldLink, newLink, true);
        
        return result.operations
            .filter(op => op.success)
            .map(op => ({
                file: op.file,
                changes: this.countLinkOccurrences(op.oldContent, oldLink)
            }));
    }

    /**
     * Count occurrences of a link in content using RegExp.exec() loops
     */
    private countLinkOccurrences(content: string, link: string): number {
        let count = 0;

        const wikiLinkRegex = new RegExp(String.raw`\[\[${this.escapeRegex(link)}(\|[^\]]+)?\]\]`, 'g');
        // iterate using exec() without assigning to a throwaway variable
        while (wikiLinkRegex.exec(content) !== null) {
            count++;
        }

        const mdLinkRegex = new RegExp(String.raw`\[([^\]]+)\]\(${this.escapeRegex(link)}\)`, 'g');
        while (mdLinkRegex.exec(content) !== null) {
            count++;
        }

        return count;
    }

    /**
     * Escape special regex characters
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\\$&`);
    }

    /**
     * Get basename from path (without extension)
     */
    private getBaseName(path: string): string {
        const name = path.split('/').pop() || path;
        return name.replace(/\.md$/, '');
    }

    /**
     * Get undo history
     */
    getUndoHistory(): Array<{ timestamp: Date; operationCount: number }> {
        return this.undoStack.map(op => ({
            timestamp: new Date(op.timestamp),
            operationCount: op.operations.length
        }));
    }

    /**
     * Clear undo history
     */
    clearUndoHistory(): void {
        this.undoStack = [];
    }
}
