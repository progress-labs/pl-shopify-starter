import { defineConfig } from 'vite'
import shopify from 'vite-plugin-shopify'
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
  plugins: [shopify(shopifyConfig), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: '[name].[hash].min.js',
        chunkFileNames: '[name].[hash].min.js',
        assetFileNames: '[name].[hash].min[extname]'
      }
    }
  }
})
