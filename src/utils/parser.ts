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
			number: Number.parseInt(pureNumberMatch[1], 10),
			suffix: '',
			fullMatch: pureNumberMatch[0]
		};
	}

	// Try prefix + number pattern
	const prefixMatch = basename.match(/^(.+?)(\d+)$/);
	if (prefixMatch) {
		return {
			prefix: prefixMatch[1],
			number: Number.parseInt(prefixMatch[2], 10),
			suffix: '',
			fullMatch: prefixMatch[0]
		};
	}

	// Try complex pattern: prefix + number + suffix
	const complexMatch = basename.match(/^(.+?)(\d+)(.+)$/);
	if (complexMatch) {
		return {
			prefix: complexMatch[1],
			number: Number.parseInt(complexMatch[2], 10),
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
	const isoMatch = basename.match(/(\d{4})-(\d{2})-(\d{2})/);
	if (isoMatch) {
		return createStrictDate(isoMatch[1], isoMatch[2], isoMatch[3]);
	}

	const compactMatch = basename.match(/(\d{4})(\d{2})(\d{2})/);
	if (compactMatch) {
		return createStrictDate(compactMatch[1], compactMatch[2], compactMatch[3]);
	}

	return null;
}

/**
 * Extract basename without extension
 */
export function getBasename(filename: string): string {
	return filename.replace(/\.[^/.]+$/, '');
}

function createStrictDate(yearText: string, monthText: string, dayText: string): Date | null {
	const year = Number.parseInt(yearText, 10);
	const month = Number.parseInt(monthText, 10);
	const day = Number.parseInt(dayText, 10);
	const date = new Date(Date.UTC(year, month - 1, day));

	if (
		date.getUTCFullYear() !== year
		|| date.getUTCMonth() !== month - 1
		|| date.getUTCDate() !== day
	) {
		return null;
	}

	return date;
}
