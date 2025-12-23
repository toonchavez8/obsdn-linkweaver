/**
 * Parse a note title to extract sequential patterns
 */
export interface ParsedPattern {
	prefix: string;
	number: number;
	suffix: string;
	fullMatch: string;
}

/**
 * Extract numeric pattern from a filename
 */
export function parseNumericPattern(basename: string): ParsedPattern | null {
	// Try pure number pattern
	const pureNumberMatch = basename.match(/^(\d+)$/);
	if (pureNumberMatch) {
		return {
			prefix: '',
			number: parseInt(pureNumberMatch[1]),
			suffix: '',
			fullMatch: pureNumberMatch[0]
		};
	}

	// Try prefix + number pattern
	const prefixMatch = basename.match(/^(.+?)(\d+)$/);
	if (prefixMatch) {
		return {
			prefix: prefixMatch[1],
			number: parseInt(prefixMatch[2]),
			suffix: '',
			fullMatch: prefixMatch[0]
		};
	}

	// Try complex pattern: prefix + number + suffix
	const complexMatch = basename.match(/^(.+?)(\d+)(.+)$/);
	if (complexMatch) {
		return {
			prefix: complexMatch[1],
			number: parseInt(complexMatch[2]),
			suffix: complexMatch[3],
			fullMatch: complexMatch[0]
		};
	}

	return null;
}

/**
 * Parse a date from a filename
 */
export function parseDatePattern(basename: string): Date | null {
	// Try ISO format: YYYY-MM-DD
	const isoMatch = basename.match(/(\d{4})-(\d{2})-(\d{2})/);
	if (isoMatch) {
		const date = new Date(isoMatch[0]);
		if (!isNaN(date.getTime())) {
			return date;
		}
	}

	// Try compact format: YYYYMMDD
	const compactMatch = basename.match(/(\d{4})(\d{2})(\d{2})/);
	if (compactMatch) {
		const dateStr = `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
		const date = new Date(dateStr);
		if (!isNaN(date.getTime())) {
			return date;
		}
	}

	return null;
}

/**
 * Extract basename without extension
 */
export function getBasename(filename: string): string {
	return filename.replace(/\.[^/.]+$/, '');
}
