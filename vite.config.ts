import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { localScreenshots } from './scripts/local-screenshots.ts';
export default defineConfig({ base: './', plugins: [localScreenshots()], server: { host: '127.0.0.1' }, build: { rollupOptions: { input: { main: resolve(import.meta.dirname, 'index.html'), newMembers: resolve(import.meta.dirname, 'new-members/index.html') } } } });
