import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'fonts/*.ttf'],
      manifest: {
        name: 'MyVoucher — খরচ ও ভাউচার',
        short_name: 'MyVoucher',
        description: 'বাংলা ভাষায় ব্যক্তিগত খরচ ও ভাউচার ব্যবস্থাপনা — সম্পূর্ণ অফলাইন।',
        lang: 'bn',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#f5f2ea',
        theme_color: '#0f5a48',
        categories: ['finance', 'productivity', 'business'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,ttf,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/icons\//, /^\/fonts\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          database: ['dexie', 'dexie-react-hooks'],
          pdf: ['jspdf', 'html2canvas'],
        },
      },
    },
  },
});
