import { TFile, Vault } from 'obsidian';
import { parseNumericPattern, parseDatePattern, getBasename } from '../utils/parser';
import { naturalSort } from '../utils/sorter';
import { Cache } from '../utils/cache';
import { PatternConfig } from '../settings';

export interface SequenceInfo {
	files: TFile[];
	currentIndex: number;
	pattern: string;
	type: 'numeric' | 'date' | 'custom';
}

export class SequenceDetector {
	private vault: Vault;
	private cache: Cache<string, SequenceInfo>;
	private customPatterns: PatternConfig[];

	constructor(vault: Vault, customPatterns: PatternConfig[] = []) {
		this.vault = vault;
		this.cache = new Cache<string, SequenceInfo>(60000);
		this.customPatterns = customPatterns;
	}

	detectSequence(file: TFile): SequenceInfo | null {
		const cached = this.cache.get(file.path);
		if (cached) {
			return cached;
		}

		const sequence = this.detectDateSequence(file)
			?? this.detectNumericSequence(file)
			?? this.detectCustomSequence(file);

		if (sequence) {
			this.cache.set(file.path, sequence);
		}

		return sequence;
	}

	updatePatterns(patterns: PatternConfig[]): void {
		this.customPatterns = patterns;
		this.cache.clear();
	}

	clearCache(): void {
		this.cache.clear();
	}

	invalidateFile(filePath: string): void {
		this.cache.delete(filePath);
	}

	private detectNumericSequence(file: TFile): SequenceInfo | null {
		const parsed = parseNumericPattern(getBasename(file.name));
		if (!parsed) {
			return null;
		}

		const matchingFiles = this.getFolderFiles(file).filter(candidateFile => {
			const candidatePattern = parseNumericPattern(getBasename(candidateFile.name));
			return candidatePattern?.prefix === parsed.prefix && candidatePattern.suffix === parsed.suffix;
		});

		return this.createSequenceInfo(file, matchingFiles, parsed.prefix || 'numeric', 'numeric');
	}

	private detectDateSequence(file: TFile): SequenceInfo | null {
		const date = parseDatePattern(getBasename(file.name));
		if (!date) {
			return null;
		}

		const matchingFiles = this.getFolderFiles(file)
			.filter(candidateFile => parseDatePattern(getBasename(candidateFile.name)) !== null);

		return this.createSequenceInfo(file, matchingFiles, 'date', 'date');
	}

	private detectCustomSequence(file: TFile): SequenceInfo | null {
		const basename = getBasename(file.name);

		for (const pattern of this.customPatterns) {
			if (!pattern.enabled) {
				continue;
			}

			try {
				const regex = new RegExp(pattern.regex);
				if (!regex.test(basename)) {
					continue;
				}

				const matchingFiles = this.getFolderFiles(file).filter(candidateFile => {
					const candidateRegex = new RegExp(pattern.regex);
					return candidateRegex.test(getBasename(candidateFile.name));
				});

				const sequence = this.createSequenceInfo(file, matchingFiles, pattern.name, 'custom');
				if (sequence) {
					return sequence;
				}
			} catch (error) {
				console.error(`Invalid regex pattern: ${pattern.regex}`, error);
			}
		}

		return null;
	}

	private createSequenceInfo(
		file: TFile,
		matchingFiles: TFile[],
		pattern: string,
		type: SequenceInfo['type']
	): SequenceInfo | null {
		if (matchingFiles.length < 2) {
			return null;
		}

		const sortedFiles = type === 'date'
			? this.sortFilesByDate(matchingFiles)
			: this.sortFilesNaturally(matchingFiles);
		const currentIndex = sortedFiles.findIndex(candidateFile => candidateFile.path === file.path);

		if (currentIndex === -1) {
			return null;
		}

		return {
			files: sortedFiles,
			currentIndex,
			pattern,
			type
		};
	}

	private getFolderFiles(file: TFile): TFile[] {
		return this.vault.getMarkdownFiles()
			.filter(candidateFile => candidateFile.parent?.path === file.parent?.path);
	}

	private sortFilesNaturally(files: TFile[]): TFile[] {
		return [...files].sort((firstFile, secondFile) => naturalSort(firstFile.name, secondFile.name));
	}

	private sortFilesByDate(files: TFile[]): TFile[] {
		return [...files].sort((firstFile, secondFile) => {
			const firstDate = parseDatePattern(getBasename(firstFile.name));
			const secondDate = parseDatePattern(getBasename(secondFile.name));

			if (!firstDate || !secondDate) {
				return 0;
			}

			return firstDate.getTime() - secondDate.getTime();
		});
	}
}
