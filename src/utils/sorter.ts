/**
 * Natural sort comparator for strings containing numbers
 * Handles cases like "Note 1", "Note 2", "Note 10" correctly
 */
export function naturalSort(a: string, b: string): number {
	const regex = /(\d+)|(\D+)/g;
	const aParts = a.match(regex) || [];
	const bParts = b.match(regex) || [];

	for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
		const aPart = aParts[i] || '';
		const bPart = bParts[i] || '';

		// If both parts are numbers, compare numerically
		const aNum = parseInt(aPart);
		const bNum = parseInt(bPart);

		if (!isNaN(aNum) && !isNaN(bNum)) {
			if (aNum !== bNum) {
				return aNum - bNum;
			}
		} else {
			// Compare as strings
			if (aPart !== bPart) {
				return aPart.localeCompare(bPart);
			}
		}
	}

	return 0;
}

/**
 * Sort an array of strings using natural sorting
 */
export function naturalSortArray(arr: string[]): string[] {
	return [...arr].sort(naturalSort);
}
