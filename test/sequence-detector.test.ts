import { describe, expect, it } from 'vitest';
import { TFile } from 'obsidian';
import { SequenceDetector } from '../src/navigation/sequence-detector';

function makeVault(files: TFile[]) {
	return {
		getMarkdownFiles: () => files
	};
}

describe('SequenceDetector', () => {
	it('detects numeric sequences in the same folder using natural sort', () => {
		const files = [
			new TFile('Series/Note 10.md'),
			new TFile('Series/Note 1.md'),
			new TFile('Series/Note 2.md'),
			new TFile('Other/Note 3.md')
		];
		const detector = new SequenceDetector(makeVault(files) as never);

		const sequence = detector.detectSequence(files[1]);

		expect(sequence?.type).toBe('numeric');
		expect(sequence?.files.map(file => file.name)).toEqual(['Note 1.md', 'Note 2.md', 'Note 10.md']);
		expect(sequence?.currentIndex).toBe(0);
	});

	it('detects date sequences chronologically', () => {
		const files = [
			new TFile('Daily/2025-01-03.md'),
			new TFile('Daily/2025-01-01.md'),
			new TFile('Daily/2025-01-02.md')
		];
		const detector = new SequenceDetector(makeVault(files) as never);

		const sequence = detector.detectSequence(files[2]);

		expect(sequence?.type).toBe('date');
		expect(sequence?.files.map(file => file.name)).toEqual(['2025-01-01.md', '2025-01-02.md', '2025-01-03.md']);
		expect(sequence?.currentIndex).toBe(1);
	});

	it('uses enabled custom patterns and ignores invalid patterns', () => {
		const files = [
			new TFile('Episodes/Episode A.md'),
			new TFile('Episodes/Episode B.md')
		];
		const detector = new SequenceDetector(makeVault(files) as never, [
			{ name: 'Broken', regex: '(', enabled: true },
			{ name: 'Episode', regex: '^Episode [A-Z]$', enabled: true }
		]);

		const sequence = detector.detectSequence(files[0]);

		expect(sequence?.type).toBe('custom');
		expect(sequence?.pattern).toBe('Episode');
	});
});
