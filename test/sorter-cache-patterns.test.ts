import { describe, expect, it, vi } from 'vitest';
import { Cache } from '../src/utils/cache';
import { naturalSortArray } from '../src/utils/sorter';
import { createMatcher, getActivePatterns, isValidPattern } from '../src/navigation/patterns';

describe('sorting utilities', () => {
	it('sorts numeric text naturally without mutating input', () => {
		const input = ['Note 10', 'Note 1', 'Note 2'];
		expect(naturalSortArray(input)).toEqual(['Note 1', 'Note 2', 'Note 10']);
		expect(input).toEqual(['Note 10', 'Note 1', 'Note 2']);
	});
});

describe('cache utility', () => {
	it('expires values based on max age', () => {
		vi.useFakeTimers();
		const cache = new Cache<string, string>(100);

		cache.set('key', 'value');
		expect(cache.get('key')).toBe('value');
		expect(cache.has('key')).toBe(true);

		vi.advanceTimersByTime(101);
		expect(cache.get('key')).toBeNull();
		expect(cache.has('key')).toBe(false);
		vi.useRealTimers();
	});

	it('can report that a cached null value exists', () => {
		const cache = new Cache<string, null>(1000);
		cache.set('empty', null);

		expect(cache.get('empty')).toBeNull();
		expect(cache.has('empty')).toBe(true);
	});
});

describe('pattern utilities', () => {
	it('validates regex patterns', () => {
		expect(isValidPattern('^Chapter (\\d+)$')).toBe(true);
		expect(isValidPattern('(')).toBe(false);
	});

	it('creates matchers from custom config', () => {
		const matcher = createMatcher({ name: 'Part', regex: '^(Part )(\\d+)$', enabled: true });

		expect(matcher.test('Part 4')).toBe(true);
		expect(matcher.extract('Part 4')).toMatchObject({
			prefix: 'Part ',
			value: '4',
			suffix: ''
		});
	});

	it('returns only enabled built-in and custom patterns', () => {
		const activePatterns = getActivePatterns([
			{ name: 'Enabled custom', regex: 'x', enabled: true },
			{ name: 'Disabled custom', regex: 'y', enabled: false }
		]);

		expect(activePatterns.some(pattern => pattern.name === 'Enabled custom')).toBe(true);
		expect(activePatterns.some(pattern => pattern.name === 'Disabled custom')).toBe(false);
	});
});
