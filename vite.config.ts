import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// A relative base keeps every asset URL valid on GitHub Pages (https://<user>.github.io/<repo>/),
// on a custom domain, and in a local preview, without hard-coding the repository name.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
