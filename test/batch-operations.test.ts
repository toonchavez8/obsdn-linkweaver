import { describe, expect, it, vi } from 'vitest';
import { TFile } from 'obsidian';
import { BatchOperations } from '../src/links/batch-operations';

function makeBatchApp(initialContentByPath: Record<string, string>) {
	const files = Object.keys(initialContentByPath).map(path => new TFile(path));
	const contentByPath = { ...initialContentByPath };

	return {
		app: {
			vault: {
				getMarkdownFiles: vi.fn(() => files),
				read: vi.fn(async (file: TFile) => contentByPath[file.path]),
				modify: vi.fn(async (file: TFile, content: string) => {
					contentByPath[file.path] = content;
				}),
				getAbstractFileByPath: vi.fn()
			},
			metadataCache: {
				getFileCache: vi.fn(),
				getFirstLinkpathDest: vi.fn()
			},
			workspace: {
				getActiveFile: vi.fn(),
				getLeaf: vi.fn(),
				getActiveViewOfType: vi.fn()
			}
		},
		contentByPath
	};
}

describe('BatchOperations', () => {
	it('replaces wiki and markdown links and records undo data', async () => {
		const { app, contentByPath } = makeBatchApp({
			'Notes/A.md': 'See [[Old Note]] and [[Old Note|alias]] plus [old](Old Note).'
		});
		const batchOperations = new BatchOperations(app as never);

		const result = await batchOperations.batchReplaceLink('Old Note', 'New Note');

		expect(result.success).toBe(1);
		expect(contentByPath['Notes/A.md']).toBe('See [[New Note]] and [[New Note|alias]] plus [old](New Note).');
		expect(batchOperations.getUndoHistory()).toHaveLength(1);
	});

	it('previews changes without modifying files', async () => {
		const { app, contentByPath } = makeBatchApp({
			'Notes/A.md': 'See [[Old Note]] and [old](Old Note).'
		});
		const batchOperations = new BatchOperations(app as never);

		const preview = await batchOperations.previewChanges('Old Note', 'New Note');

		expect(preview).toEqual([{ file: expect.any(TFile), changes: 2 }]);
		expect(contentByPath['Notes/A.md']).toBe('See [[Old Note]] and [old](Old Note).');
	});

	it('restores the last applied batch operation', async () => {
		const { app, contentByPath } = makeBatchApp({
			'Notes/A.md': 'See [[Old Note]].'
		});
		const batchOperations = new BatchOperations(app as never);

		await batchOperations.batchReplaceLink('Old Note', 'New Note');
		const didUndo = await batchOperations.undoLastOperation();

		expect(didUndo).toBe(true);
		expect(contentByPath['Notes/A.md']).toBe('See [[Old Note]].');
	});
});
