import { App, CachedMetadata, TFile } from 'obsidian';
import { LinkWeaverSettings } from '../settings';

export interface LinkPath {
	files: TFile[];
	length: number;
}

export interface SimilarNote {
	file: TFile;
	score: number;
	sharedLinks: string[];
}

export class PathFinder {
	private readonly app: App;
	private settings: LinkWeaverSettings;

	constructor(app: App, settings: LinkWeaverSettings) {
		this.app = app;
		this.settings = settings;
	}

	updateSettings(settings: LinkWeaverSettings): void {
		this.settings = settings;
	}

	findShortestPath(sourceFile: TFile, targetFile: TFile, maxDepth = this.settings.maxPathDepth): LinkPath | null {
		if (sourceFile.path === targetFile.path) {
			return { files: [sourceFile], length: 0 };
		}

		const visitedPaths = new Set<string>([sourceFile.path]);
		const searchQueue: TFile[][] = [[sourceFile]];

		while (searchQueue.length > 0) {
			const currentPath = searchQueue.shift();
			if (!currentPath) {
				continue;
			}

			const currentFile = currentPath[currentPath.length - 1];
			if (currentPath.length - 1 >= maxDepth) {
				continue;
			}

			for (const linkedFile of this.getOutgoingTargets(currentFile)) {
				if (visitedPaths.has(linkedFile.path)) {
					continue;
				}

				const nextPath = [...currentPath, linkedFile];
				if (linkedFile.path === targetFile.path) {
					return { files: nextPath, length: nextPath.length - 1 };
				}

				visitedPaths.add(linkedFile.path);
				searchQueue.push(nextPath);
			}
		}

		return null;
	}

	findAllPaths(sourceFile: TFile, targetFile: TFile, maxDepth = this.settings.maxPathDepth): LinkPath[] {
		const paths: LinkPath[] = [];
		this.collectPaths(sourceFile, targetFile, [sourceFile], new Set([sourceFile.path]), maxDepth, paths);
		return paths.sort((firstPath, secondPath) => firstPath.length - secondPath.length);
	}

	findSimilarNotes(sourceFile: TFile, threshold = this.settings.similarityThreshold): SimilarNote[] {
		const sourceTargets = this.getOutgoingTargetPaths(sourceFile);
		if (sourceTargets.size === 0) {
			return [];
		}

		return this.app.vault.getMarkdownFiles()
			.filter(candidateFile => candidateFile.path !== sourceFile.path)
			.filter(candidateFile => !this.isExcluded(candidateFile))
			.map(candidateFile => this.scoreSimilarity(candidateFile, sourceTargets))
			.filter((candidate): candidate is SimilarNote => candidate !== null && candidate.score >= threshold)
			.sort((firstNote, secondNote) => secondNote.score - firstNote.score);
	}

	getOutgoingTargets(file: TFile): TFile[] {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache) {
			return [];
		}

		const targetByPath = new Map<string, TFile>();
		for (const linkText of this.getLinkTexts(cache)) {
			const linkedFile = this.app.metadataCache.getFirstLinkpathDest(linkText, file.path);
			if (linkedFile && !this.isExcluded(linkedFile)) {
				targetByPath.set(linkedFile.path, linkedFile);
			}
		}

		return [...targetByPath.values()];
	}

	private collectPaths(
		currentFile: TFile,
		targetFile: TFile,
		currentPath: TFile[],
		visitedPaths: Set<string>,
		maxDepth: number,
		paths: LinkPath[]
	): void {
		if (currentPath.length - 1 >= maxDepth) {
			return;
		}

		for (const linkedFile of this.getOutgoingTargets(currentFile)) {
			if (visitedPaths.has(linkedFile.path)) {
				continue;
			}

			const nextPath = [...currentPath, linkedFile];
			if (linkedFile.path === targetFile.path) {
				paths.push({ files: nextPath, length: nextPath.length - 1 });
				continue;
			}

			visitedPaths.add(linkedFile.path);
			this.collectPaths(linkedFile, targetFile, nextPath, visitedPaths, maxDepth, paths);
			visitedPaths.delete(linkedFile.path);
		}
	}

	private scoreSimilarity(candidateFile: TFile, sourceTargets: Set<string>): SimilarNote | null {
		const candidateTargets = this.getOutgoingTargetPaths(candidateFile);
		if (candidateTargets.size === 0) {
			return null;
		}

		const sharedLinks = [...sourceTargets].filter(targetPath => candidateTargets.has(targetPath));
		const combinedTargets = new Set([...sourceTargets, ...candidateTargets]);
		const score = sharedLinks.length / combinedTargets.size;

		return {
			file: candidateFile,
			score,
			sharedLinks
		};
	}

	private getOutgoingTargetPaths(file: TFile): Set<string> {
		return new Set(this.getOutgoingTargets(file).map(targetFile => targetFile.path));
	}

	private getLinkTexts(cache: CachedMetadata): string[] {
		return [
			...(cache.links ?? []),
			...(cache.embeds ?? [])
		].map(link => link.link);
	}

	private isExcluded(file: TFile): boolean {
		return this.settings.excludeFolders.some(folderPath => {
			const normalizedFolder = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
			return file.path.startsWith(normalizedFolder);
		});
	}
}
