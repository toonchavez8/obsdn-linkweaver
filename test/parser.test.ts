import { describe, expect, it } from 'vitest';
import { getBasename, parseDatePattern, parseNumericPattern } from '../src/utils/parser';

describe('parser utilities', () => {
	it('parses numeric title patterns', () => {
		expect(parseNumericPattern('001')).toMatchObject({ prefix: '', number: 1, suffix: '' });
		expect(parseNumericPattern('Chapter 10')).toMatchObject({ prefix: 'Chapter ', number: 10, suffix: '' });
		expect(parseNumericPattern('v2 draft')).toMatchObject({ prefix: 'v', number: 2, suffix: ' draft' });
		expect(parseNumericPattern('No number')).toBeNull();
	});

	it('parses dates strictly', () => {
		expect(parseDatePattern('2025-01-31')?.toISOString()).toBe('2025-01-31T00:00:00.000Z');
		expect(parseDatePattern('daily-20250131')?.toISOString()).toBe('2025-01-31T00:00:00.000Z');
		expect(parseDatePattern('2025-02-31')).toBeNull();
		expect(parseDatePattern('not-a-date')).toBeNull();
	});

	it('removes only the last file extension', () => {
		expect(getBasename('Note.md')).toBe('Note');
		expect(getBasename('archive.tar.md')).toBe('archive.tar');
		expect(getBasename('no-extension')).toBe('no-extension');
	});
});
