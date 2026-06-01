import { defineConfig } from 'vite'
import shopify from 'vite-plugin-shopify'
import shopifyClean from '@driver-digital/vite-plugin-shopify-clean'
import tailwindcss from '@tailwindcss/vite'

/*
For some reason, when terminating or swapping branches early
The tunnel feature bugs out and breaks the preview theme.
*/
const shopifyConfig = {
  // tunnel: true
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [shopifyClean(), shopify(shopifyConfig), tailwindcss()],
  build: {
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: '[name].[hash].min.js',
        chunkFileNames: '[name].[hash].min.js',
        assetFileNames: '[name].[hash].min[extname]'
      }
    }
  }
})
