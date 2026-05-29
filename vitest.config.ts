import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
		include: ['test/**/*.test.ts'],
		coverage: {
			exclude: ['test/**', 'vitest.config.ts']
		}
	},
	resolve: {
		alias: {
			obsidian: './test/mocks/obsidian.ts'
		}
	}
});
