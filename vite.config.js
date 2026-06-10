import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/C4Clinic/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'logo.svg'],
      manifest: {
        name: 'C4CLINIC — CRM Médico',
        short_name: 'C4CLINIC',
        description: 'CRM completo para clínicas e hospitais by C4HUB',
        start_url: '/C4Clinic/',
        scope: '/C4Clinic/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#7c3aed',
        orientation: 'portrait-primary',
        lang: 'pt-BR',
        dir: 'ltr',
        categories: ['medical', 'health', 'business'],
        icons: [
          {
            src: '/C4Clinic/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/C4Clinic/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Agenda',
            url: '/C4Clinic/?page=agenda',
            description: 'Abrir agenda de consultas',
          },
          {
            name: 'Pacientes',
            url: '/C4Clinic/?page=pacientes',
            description: 'Lista de pacientes',
          },
          {
            name: 'Financeiro',
            url: '/C4Clinic/?page=financeiro',
            description: 'Painel financeiro',
          },
        ],
        screenshots: [
          {
            src: '/C4Clinic/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'C4CLINIC CRM',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/C4Clinic/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/tbfrwnfajrcpimhflmhv\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: { port: 3000 },
})
