import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Must match the GitHub repo name. Change to '/' if deploying to a user/org root page.
  // Pages paths are case-sensitive, so this matches the repo's exact casing.
  base: '/ChristadoreOS/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      base: '/ChristadoreOS/',
      scope: '/ChristadoreOS/',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'],
      manifest: {
        name: 'ChristadoreOS',
        short_name: 'ChristadoreOS',
        description: 'A calm home base for your family: calendar, groceries, spending, reminders, and countdowns.',
        theme_color: '#4F2BE7',
        background_color: '#F7F8FC',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/ChristadoreOS/',
        start_url: '/ChristadoreOS/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: '/ChristadoreOS/index.html',
      },
    }),
  ],
});
