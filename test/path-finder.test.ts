import { describe, expect, it, vi } from 'vitest';
import { TFile } from 'obsidian';
import { DEFAULT_SETTINGS } from '../src/settings';
import { PathFinder } from '../src/discovery/path-finder';

function makeApp(files: TFile[], linksByPath: Record<string, string[]>) {
	const fileByBasename = new Map(files.map(file => [file.basename, file]));

	return {
		vault: {
			getMarkdownFiles: vi.fn(() => files),
			read: vi.fn(),
			modify: vi.fn(),
			getAbstractFileByPath: vi.fn()
		},
		metadataCache: {
			getFileCache: vi.fn((file: TFile) => ({
				links: (linksByPath[file.path] ?? []).map((link, lineNumber) => ({
					link,
					position: { start: { line: lineNumber } }
				}))
			})),
			getFirstLinkpathDest: vi.fn((link: string) => fileByBasename.get(link) ?? null)
		},
		workspace: {
			getActiveFile: vi.fn(),
			getLeaf: vi.fn(),
			getActiveViewOfType: vi.fn()
		}
	};
}

describe('PathFinder', () => {
	it('finds the shortest linked path between notes', () => {
		const topicA = new TFile('Research/Topic A.md');
		const topicB = new TFile('Research/Topic B.md');
		const topicC = new TFile('Research/Topic C.md');
		const app = makeApp([topicA, topicB, topicC], {
			[topicA.path]: ['Topic B'],
			[topicB.path]: ['Topic C'],
			[topicC.path]: []
		});
		const pathFinder = new PathFinder(app as never, DEFAULT_SETTINGS);

		const path = pathFinder.findShortestPath(topicA, topicC);

		expect(path?.files.map(file => file.basename)).toEqual(['Topic A', 'Topic B', 'Topic C']);
		expect(path?.length).toBe(2);
	});

	it('returns all acyclic paths within depth limit', () => {
		const topicA = new TFile('Research/Topic A.md');
		const topicB = new TFile('Research/Topic B.md');
		const topicC = new TFile('Research/Topic C.md');
		const topicD = new TFile('Research/Topic D.md');
		const app = makeApp([topicA, topicB, topicC, topicD], {
			[topicA.path]: ['Topic B', 'Topic C'],
			[topicB.path]: ['Topic D'],
			[topicC.path]: ['Topic D'],
			[topicD.path]: []
		});
		const pathFinder = new PathFinder(app as never, DEFAULT_SETTINGS);

		const paths = pathFinder.findAllPaths(topicA, topicD, 2);

		expect(paths.map(path => path.files.map(file => file.basename).join(' > '))).toEqual([
			'Topic A > Topic B > Topic D',
			'Topic A > Topic C > Topic D'
		]);
	});

	it('scores notes by shared outgoing links', () => {
		const source = new TFile('Research/Source.md');
		const similar = new TFile('Research/Similar.md');
		const different = new TFile('Research/Different.md');
		const sharedA = new TFile('Research/Shared A.md');
		const sharedB = new TFile('Research/Shared B.md');
		const app = makeApp([source, similar, different, sharedA, sharedB], {
			[source.path]: ['Shared A', 'Shared B'],
			[similar.path]: ['Shared A', 'Shared B'],
			[different.path]: ['Shared A'],
			[sharedA.path]: [],
			[sharedB.path]: []
		});
		const pathFinder = new PathFinder(app as never, { ...DEFAULT_SETTINGS, similarityThreshold: 0.75 });

		const notes = pathFinder.findSimilarNotes(source);

		expect(notes.map(note => note.file.basename)).toEqual(['Similar']);
		expect(notes[0].score).toBe(1);
	});
});
