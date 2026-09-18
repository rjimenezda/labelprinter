import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
  build: {
    // Safari 13 ~= WKWebView baseline until probe P5 says otherwise.
    target: ['es2017', 'safari13'],
    cssTarget: 'safari13',
  },
})
