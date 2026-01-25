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
    // We are using NodeJS build of pcloud JS sdk in the bundle to avoid bundling it twice.
    // However, it requires some polyfills to run in the browser.
    nodePolyfills({
      // Exclude 'stream' to prevent SSR build from failing with ENOENT when
      // resolving 'node:stream/web' via stream-browserify/web.
      exclude: ['stream'],
    }),
    devtools(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      spa: {
        enabled: true,
        prerender: {
          outputPath: '/index.html',
        },
      },
    }),
    viteReact(),
  ],
  define: {
    // pcloud-sdk-js uses this global variable to determine the location id.
    // We are using NodeJS build of pcloud JS sdk in the bundle to avoid bundling it twice.
    // However, it requires some polyfills to run in the browser.
    locationid: 'undefined',
  },
})

export default config
