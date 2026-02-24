// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    server: {
      port: 8029,
      strictPort: true,
    },
  },
  server: {
    port: 7029,
  },
});
