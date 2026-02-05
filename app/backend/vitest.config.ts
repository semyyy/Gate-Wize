import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./src/test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json'],
            exclude: [
                'node_modules/**',
                'dist/**',
                'src/test/**',
                '**/*.test.ts',
                '**/*.config.ts',
                'src/index.ts',
                'src/lib/data/minioClient.ts',
                'src/lib/genai/llmClient.ts',
                'src/lib/genai/utils/**',
                'src/lib/pdf/**',
                'src/routes/export-pdf.ts',
            ],
            thresholds: {
                lines: 60,
                functions: 60,
                branches: 60,
                statements: 60,
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
