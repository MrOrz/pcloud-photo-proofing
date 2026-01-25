import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const config = defineConfig({
  // Matching the base path of the GitHub Pages deployment
  base: '/pcloud-photo-proofing/',
  plugins: [
    nodePolyfills(),
    devtools(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      spa: {
        prerender: {
          outputPath: '/index.html',
        },
      },
    }),
    viteReact(),
  ],
  define: {
    global: 'window',
    locationid: 'undefined',
  },
})

export default config
