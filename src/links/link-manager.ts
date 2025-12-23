import { App, TFile, CachedMetadata } from 'obsidian';
import { ValidationRuleConfig } from '../settings';

export interface LinkInfo {
	sourceFile: TFile;
	linkText: string;
	displayText: string;
	line: number;
	isResolved: boolean;
	targetFile: TFile | null;
	ruleViolations?: { rule: string; message: string; severity: 'error' | 'warning' }[];
}

export interface ValidationResult {
	brokenLinks: LinkInfo[];
	unresolvedLinks: LinkInfo[];
	totalFiles: number;
	totalLinks: number;
	timestamp: number;
}

export class LinkManager {
	private readonly app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Validate all links in the vault
	 */
	async validateAllLinks(): Promise<ValidationResult> {
		const files = this.app.vault.getMarkdownFiles();
		const brokenLinks: LinkInfo[] = [];
		const unresolvedLinks: LinkInfo[] = [];
		let totalLinks = 0;

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache) continue;

			const fileLinks = this.extractLinksFromCache(file, cache);
			totalLinks += fileLinks.length;

			for (const link of fileLinks) {
				if (!link.isResolved) {
					unresolvedLinks.push(link);
				} else if (link.targetFile && !this.app.vault.getAbstractFileByPath(link.targetFile.path)) {
					brokenLinks.push(link);
				}
			}
		}

		return {
			brokenLinks,
			unresolvedLinks,
			totalFiles: files.length,
			totalLinks,
			timestamp: Date.now()
		};
	}

	/**
	 * Validate links in a specific file
	 */
	async validateFileLinks(file: TFile): Promise<LinkInfo[]> {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache) return [];

		return this.extractLinksFromCache(file, cache);
	}

	/**
	 * Extract link information from cache
	 */
	private extractLinksFromCache(file: TFile, cache: CachedMetadata): LinkInfo[] {
		const links: LinkInfo[] = [];

		// Process regular links
		if (cache.links) {
			for (const link of cache.links) {
				const resolved = this.resolveLink(link.link, file);
				links.push({
					sourceFile: file,
					linkText: link.link,
					displayText: link.displayText || link.link,
					line: link.position.start.line,
					isResolved: resolved !== null,
					targetFile: resolved
				});
			}
		}

		// Process embedded links
		if (cache.embeds) {
			for (const embed of cache.embeds) {
				const resolved = this.resolveLink(embed.link, file);
				links.push({
					sourceFile: file,
					linkText: embed.link,
					displayText: embed.displayText || embed.link,
					line: embed.position.start.line,
					isResolved: resolved !== null,
					targetFile: resolved
				});
			}
		}

		return links;
	}

	/**
	 * Resolve a link to its target file
	 */
	private resolveLink(linkText: string, sourceFile: TFile): TFile | null {
		// Remove block references and headers
		const cleanLink = linkText.split('#')[0].split('|')[0];
		
		// Try to resolve the link
		const resolved = this.app.metadataCache.getFirstLinkpathDest(cleanLink, sourceFile.path);
		return resolved;
	}

	/**
	 * Get all orphaned notes (no incoming or outgoing links)
	 */
	getOrphanedNotes(): TFile[] {
		const files = this.app.vault.getMarkdownFiles();
		const orphaned: TFile[] = [];

		for (const file of files) {
			const hasOutgoing = this.hasOutgoingLinks(file);
			const hasIncoming = this.hasIncomingLinks(file);

			if (!hasOutgoing && !hasIncoming) {
				orphaned.push(file);
			}
		}

		return orphaned;
	}

	/**
	 * Check if file has outgoing links
	 */
	private hasOutgoingLinks(file: TFile): boolean {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache) return false;

		const hasLinks = (cache.links?.length ?? 0) > 0;
		const hasEmbeds = (cache.embeds?.length ?? 0) > 0;

		return hasLinks || hasEmbeds;
	}

	/**
	 * Check if file has incoming links (backlinks)
	 */
	private hasIncomingLinks(file: TFile): boolean {
		// Check if any other file links to this file
		const allFiles = this.app.vault.getMarkdownFiles();
		for (const otherFile of allFiles) {
			if (otherFile.path === file.path) continue;
			
			const cache = this.app.metadataCache.getFileCache(otherFile);
			if (!cache) continue;
			
			const links = [...(cache.links || []), ...(cache.embeds || [])];
			for (const link of links) {
				const resolved = this.resolveLink(link.link, otherFile);
				if (resolved?.path === file.path) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * Get link statistics for a file
	 */
	getLinkStats(file: TFile): { outgoing: number; incoming: number; unresolved: number } {
		const cache = this.app.metadataCache.getFileCache(file);
		let outgoing = 0;
		let unresolved = 0;

		if (cache) {
			const links = this.extractLinksFromCache(file, cache);
			outgoing = links.length;
			unresolved = links.filter(l => !l.isResolved).length;
		}

		// Count incoming links by checking all files
		let incoming = 0;
		const allFiles = this.app.vault.getMarkdownFiles();
		for (const otherFile of allFiles) {
			if (otherFile.path === file.path) continue;
			
			const otherCache = this.app.metadataCache.getFileCache(otherFile);
			if (!otherCache) continue;
			
			const links = [...(otherCache.links || []), ...(otherCache.embeds || [])];
			for (const link of links) {
				const resolved = this.resolveLink(link.link, otherFile);
				if (resolved?.path === file.path) {
					incoming++;
				}
			}
		}

		return { outgoing, incoming, unresolved };
	}

	/**
	 * Find hub pages (notes with many links)
	 */
	getHubPages(threshold: number = 10): Array<{ file: TFile; linkCount: number }> {
		const files = this.app.vault.getMarkdownFiles();
		const hubs: Array<{ file: TFile; linkCount: number }> = [];

		for (const file of files) {
			const stats = this.getLinkStats(file);
			const totalLinks = stats.outgoing + stats.incoming;

			if (totalLinks >= threshold) {
				hubs.push({ file, linkCount: totalLinks });
			}
		}

		// Sort by link count descending
		return hubs.sort((a, b) => b.linkCount - a.linkCount);
	}

	/**
	 * Apply custom validation rules to links
	 */
	applyValidationRules(links: LinkInfo[], rules: ValidationRuleConfig[]): LinkInfo[] {
		const enabledRules = rules.filter(rule => rule.enabled);
		if (enabledRules.length === 0) return links;

		for (const link of links) {
			const violations: { rule: string; message: string; severity: 'error' | 'warning' }[] = [];

			for (const rule of enabledRules) {
				const violation = this.checkRule(link, rule);
				if (violation) {
					violations.push({
						rule: rule.name,
						message: rule.error,
						severity: rule.severity
					});
				}
			}

			if (violations.length > 0) {
				link.ruleViolations = violations;
			}
		}

		return links;
	}

	/**
	 * Check if a link violates a validation rule
	 */
	private checkRule(link: LinkInfo, rule: ValidationRuleConfig): boolean {
		switch (rule.type) {
			case 'pattern':
				if (rule.pattern) {
					const regex = new RegExp(rule.pattern);
					return regex.test(link.linkText);
				}
				break;

			case 'folder':
				if (rule.folder && link.targetFile) {
					const folderPath = rule.folder.endsWith('/') ? rule.folder : rule.folder + '/';
					return link.targetFile.path.startsWith(folderPath);
				}
				break;

			case 'extension':
				if (rule.extensions && link.targetFile) {
					const ext = link.targetFile.extension;
					return !rule.extensions.includes(ext);
				}
				break;

			case 'custom':
				// Custom rules can be extended in the future
				break;
		}

		return false;
	}

	/**
	 * Export link statistics to CSV format
	 */
	exportStatsToCSV(): string {
		const files = this.app.vault.getMarkdownFiles();
		const rows: string[] = ['File,Outgoing Links,Incoming Links,Unresolved Links,Total Links'];

		for (const file of files) {
			const stats = this.getLinkStats(file);
			const total = stats.outgoing + stats.incoming;
			rows.push(`"${file.path}",${stats.outgoing},${stats.incoming},${stats.unresolved},${total}`);
		}

		return rows.join('\n');
	}

	/**
	 * Export link statistics to JSON format
	 */
	exportStatsToJSON(): string {
		const files = this.app.vault.getMarkdownFiles();
		const stats = files.map(file => {
			const linkStats = this.getLinkStats(file);
			return {
				file: file.path,
				outgoing: linkStats.outgoing,
				incoming: linkStats.incoming,
				unresolved: linkStats.unresolved,
				total: linkStats.outgoing + linkStats.incoming
			};
		});

		return JSON.stringify({ 
			exportDate: new Date().toISOString(),
			totalFiles: files.length,
			statistics: stats 
		}, null, 2);
	}
}

