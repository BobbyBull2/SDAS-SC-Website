import { defineConfig } from 'vite';
import { localScreenshots } from './scripts/local-screenshots.ts';
export default defineConfig({ base: './', plugins: [localScreenshots()], server: { host: '127.0.0.1' } });
