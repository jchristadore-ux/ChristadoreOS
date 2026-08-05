import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Must match the GitHub repo name. Change to '/' if deploying to a user/org root page.
  // Pages paths are case-sensitive, so this matches the repo's exact casing.
  base: '/FamilyOS/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      base: '/FamilyOS/',
      scope: '/FamilyOS/',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'],
      manifest: {
        name: 'FamilyOS',
        short_name: 'FamilyOS',
        description: 'A calm home base for your family: calendar, groceries, spending, reminders, and countdowns.',
        theme_color: '#C2703D',
        background_color: '#FAF7F2',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/FamilyOS/',
        start_url: '/FamilyOS/',
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
        navigateFallback: '/FamilyOS/index.html',
      },
    }),
  ],
});
