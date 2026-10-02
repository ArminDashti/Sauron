import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config
export default defineConfig({
  define: {
    'process.env.GOOSE_TUNNEL': JSON.stringify(process.env.GOOSE_TUNNEL !== 'no' && process.env.GOOSE_TUNNEL !== 'none'),
  },

  // react() provides Fast Refresh so renderer edits apply without a full reload.
  plugins: [react(), tailwindcss()],

  // Vite caches a copy of @aaif/goose-acp-client and doesn't notice when we rebuild it
  // locally, so it serves stale code until you clear node_modules/.vite by hand.
  // Excluding it makes Vite always read the latest ui/goose-acp-client/dist build.
  // Dev-server only — release builds ignore optimizeDeps.
  optimizeDeps: {
    exclude: ['@aaif/goose-acp-client'],
  },

  server: {
    watch: {
      ignored: ['!**/node_modules/@aaif/goose-acp-client/**'],
    },
  },

  build: {
    target: 'esnext'
  },
});
