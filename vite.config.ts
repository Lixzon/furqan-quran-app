import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const manifest = {
  name: 'Furqan Quran',
  short_name: 'Furqan Quran',
  description:
    'Read, listen and learn the Qur’an — all 114 surahs with translation, transliteration and recitation, plus playlists, sayings, reminders and progress tracking.',
  theme_color: '#0d9488',
  background_color: '#f3f7f5',
  display: 'standalone',
  display_override: ['standalone', 'minimal-ui', 'browser'],
  orientation: 'portrait-primary',
  id: '/',
  start_url: '/',
  scope: '/',
  lang: 'en',
  dir: 'ltr',
  prefer_related_applications: false,
  categories: ['books', 'education', 'music'],
  shortcuts: [
    { name: 'Last read', short_name: 'Continue', url: '/progress' },
    { name: 'Saved ayahs', short_name: 'Saved', url: '/bookmarks' },
  ],
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    {
      src: 'icons/maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: 'icons/maskable-192.png',
      sizes: '192x192',
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
        globPatterns: ['**/*.{js,css,html,json,svg,png,ico,ttf,woff2,mp3}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
});
