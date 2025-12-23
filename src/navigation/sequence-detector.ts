import { TFile, Vault } from 'obsidian';
import { parseNumericPattern, parseDatePattern, getBasename } from '../utils/parser';
import { naturalSortArray } from '../utils/sorter';
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
		this.cache = new Cache<string, SequenceInfo>(60000); // 1 minute cache
		this.customPatterns = customPatterns;
	}

	/**
	 * Detect sequence for the current file
	 */
	detectSequence(file: TFile): SequenceInfo | null {
		// Check cache first
		const cached = this.cache.get(file.path);
		if (cached) {
			return cached;
		}

		// Try numeric pattern detection
		const numericSequence = this.detectNumericSequence(file);
		if (numericSequence) {
			this.cache.set(file.path, numericSequence);
			return numericSequence;
		}

		// Try date pattern detection
		const dateSequence = this.detectDateSequence(file);
		if (dateSequence) {
			this.cache.set(file.path, dateSequence);
			return dateSequence;
		}

		// Try custom patterns
		const customSequence = this.detectCustomSequence(file);
		if (customSequence) {
			this.cache.set(file.path, customSequence);
			return customSequence;
		}

		return null;
	}

	/**
	 * Detect numeric sequences (e.g., "Note 1", "Note 2", "Chapter 10")
	 */
	private detectNumericSequence(file: TFile): SequenceInfo | null {
		const basename = getBasename(file.name);
		const parsed = parseNumericPattern(basename);

		if (!parsed) {
			return null;
		}

		// Get all markdown files in the same folder
		const folderFiles = this.vault.getMarkdownFiles()
			.filter(f => f.parent?.path === file.parent?.path);

		// Find files with the same pattern
		const matchingFiles: TFile[] = [];
		const pattern = parsed.prefix || 'numeric';

		for (const f of folderFiles) {
			const fBasename = getBasename(f.name);
			const fParsed = parseNumericPattern(fBasename);

			if (fParsed && fParsed.prefix === parsed.prefix && fParsed.suffix === parsed.suffix) {
				matchingFiles.push(f);
			}
		}

		// Need at least 2 files to form a sequence
		if (matchingFiles.length < 2) {
			return null;
		}

		// Sort files using natural sort
		const sortedFiles = this.sortFilesByPattern(matchingFiles, 'numeric');
		const currentIndex = sortedFiles.findIndex(f => f.path === file.path);

		return {
			files: sortedFiles,
			currentIndex,
			pattern,
			type: 'numeric'
		};
	}

	/**
	 * Detect date-based sequences (e.g., "2025-01-01", "2025-01-02")
	 */
	private detectDateSequence(file: TFile): SequenceInfo | null {
		const basename = getBasename(file.name);
		const date = parseDatePattern(basename);

		if (!date) {
			return null;
		}

		// Get all markdown files in the same folder
		const folderFiles = this.vault.getMarkdownFiles()
			.filter(f => f.parent?.path === file.parent?.path);

		// Find files with date patterns
		const matchingFiles: TFile[] = [];

		for (const f of folderFiles) {
			const fBasename = getBasename(f.name);
			const fDate = parseDatePattern(fBasename);

			if (fDate) {
				matchingFiles.push(f);
			}
		}

		// Need at least 2 files to form a sequence
		if (matchingFiles.length < 2) {
			return null;
		}

		// Sort files by date
		const sortedFiles = matchingFiles.sort((a, b) => {
			const dateA = parseDatePattern(getBasename(a.name));
			const dateB = parseDatePattern(getBasename(b.name));
			
			if (!dateA || !dateB) return 0;
			return dateA.getTime() - dateB.getTime();
		});

		const currentIndex = sortedFiles.findIndex(f => f.path === file.path);

		return {
			files: sortedFiles,
			currentIndex,
			pattern: 'date',
			type: 'date'
		};
	}

	/**
	 * Detect custom pattern sequences
	 */
	private detectCustomSequence(file: TFile): SequenceInfo | null {
		const basename = getBasename(file.name);

		for (const pattern of this.customPatterns) {
			if (!pattern.enabled) continue;

			try {
				const regex = new RegExp(pattern.regex);
				const match = basename.match(regex);

				if (match) {
					// Get all markdown files in the same folder
					const folderFiles = this.vault.getMarkdownFiles()
						.filter(f => f.parent?.path === file.parent?.path);

					// Find files matching the same custom pattern
					const matchingFiles = folderFiles.filter(f => {
						const fBasename = getBasename(f.name);
						return regex.test(fBasename);
					});

					if (matchingFiles.length < 2) {
						continue;
					}

					// Sort using natural sort
					const sortedFiles = this.sortFilesByPattern(matchingFiles, 'numeric');
					const currentIndex = sortedFiles.findIndex(f => f.path === file.path);

					return {
						files: sortedFiles,
						currentIndex,
						pattern: pattern.name,
						type: 'custom'
					};
				}
			} catch (e) {
				console.error(`Invalid regex pattern: ${pattern.regex}`, e);
			}
		}

		return null;
	}

	/**
	 * Sort files by their sequence pattern
	 */
	private sortFilesByPattern(files: TFile[], type: string): TFile[] {
		if (type === 'date') {
			return files.sort((a, b) => {
				const dateA = parseDatePattern(getBasename(a.name));
				const dateB = parseDatePattern(getBasename(b.name));
				
				if (!dateA || !dateB) return 0;
				return dateA.getTime() - dateB.getTime();
			});
		}

		// Default to natural sort for numeric patterns
		const fileNames = files.map(f => f.name);
		const sortedNames = naturalSortArray(fileNames);
		
		return sortedNames.map(name => 
			files.find(f => f.name === name)!
		).filter(f => f !== undefined);
	}

	/**
	 * Update custom patterns
	 */
	updatePatterns(patterns: PatternConfig[]): void {
		this.customPatterns = patterns;
		this.cache.clear();
	}

	/**
	 * Clear the cache
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Invalidate cache for a specific file
	 */
	invalidateFile(filePath: string): void {
		this.cache.delete(filePath);
	}
}
