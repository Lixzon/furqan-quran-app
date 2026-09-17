import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const manifest = {
  name: 'Furqan — Offline Quran',
  short_name: 'Furqan',
  description:
    'Offline-first Quran reader with custom multi-surah playlists, audio recitations, sayings & quotes, and progress tracking.',
  theme_color: '#0d9488',
  background_color: '#f3f7f5',
  display: 'standalone',
  orientation: 'portrait-primary',
  start_url: '/',
  scope: '/',
  lang: 'en',
  categories: ['books', 'education', 'music'],
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    {
      src: 'icons/maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};

export default defineConfig({
  server: {
    proxy: {
      '/audio-surah': {
        target: 'https://cdn.islamic.network',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/audio-surah/, '/quran/audio-surah'),
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public-sw',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false, // we register via virtual:pwa-register in main.tsx
      manifest,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,ttf,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
});
