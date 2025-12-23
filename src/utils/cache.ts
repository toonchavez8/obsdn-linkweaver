/**
 * Simple cache implementation for storing computed values
 */
export class Cache<K, V> {
	private cache: Map<K, { value: V; timestamp: number }>;
	private maxAge: number;

	constructor(maxAgeMs: number = 60000) {
		this.cache = new Map();
		this.maxAge = maxAgeMs;
	}

	set(key: K, value: V): void {
		this.cache.set(key, {
			value,
			timestamp: Date.now()
		});
	}

	get(key: K): V | null {
		const entry = this.cache.get(key);
		if (!entry) {
			return null;
		}

		// Check if entry is still valid
		if (Date.now() - entry.timestamp > this.maxAge) {
			this.cache.delete(key);
			return null;
		}

		return entry.value;
	}

	has(key: K): boolean {
		return this.get(key) !== null;
	}

	clear(): void {
		this.cache.clear();
	}

	delete(key: K): boolean {
		return this.cache.delete(key);
	}
}
