import { PatternConfig } from '../settings';

/**
 * Built-in pattern definitions for sequence detection
 */
export const BUILTIN_PATTERNS: PatternConfig[] = [
	{
		name: 'Simple Numeric',
		regex: '^(\\d+)$',
		enabled: true
	},
	{
		name: 'Prefixed Numeric',
		regex: '^(.+?)(\\d+)$',
		enabled: true
	},
	{
		name: 'Date ISO',
		regex: '\\d{4}-\\d{2}-\\d{2}',
		enabled: true
	},
	{
		name: 'Date Compact',
		regex: '\\d{8}',
		enabled: false
	},
	{
		name: 'Semantic Version',
		regex: 'v?(\\d+)\\.(\\d+)\\.(\\d+)',
		enabled: false
	}
];

/**
 * Pattern type definitions
 */
export enum PatternType {
	NUMERIC = 'numeric',
	DATE = 'date',
	CUSTOM = 'custom'
}

/**
 * Pattern matcher interface
 */
export interface PatternMatcher {
	name: string;
	test: (filename: string) => boolean;
	extract: (filename: string) => PatternMatch | null;
}

/**
 * Pattern match result
 */
export interface PatternMatch {
	prefix: string;
	value: string | number;
	suffix: string;
	type: PatternType;
}

/**
 * Validate a regex pattern
 */
export function isValidPattern(pattern: string): boolean {
	try {
		new RegExp(pattern);
		return true;
	} catch (e) {
		return false;
	}
}

/**
 * Create a pattern matcher from a PatternConfig
 */
export function createMatcher(config: PatternConfig): PatternMatcher {
	const regex = new RegExp(config.regex);

	return {
		name: config.name,
		test: (filename: string) => regex.test(filename),
		extract: (filename: string) => {
			const match = filename.match(regex);
			if (!match) return null;

			// Try to extract meaningful parts
			if (match.length >= 2) {
				return {
					prefix: match[1] || '',
					value: match[2] || match[1] || '',
					suffix: match[3] || '',
					type: PatternType.CUSTOM
				};
			}

			return {
				prefix: '',
				value: match[0],
				suffix: '',
				type: PatternType.CUSTOM
			};
		}
	};
}

/**
 * Get all active patterns (builtin + custom)
 */
export function getActivePatterns(customPatterns: PatternConfig[]): PatternConfig[] {
	return [...BUILTIN_PATTERNS, ...customPatterns].filter(p => p.enabled);
}
