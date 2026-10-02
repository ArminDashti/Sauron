import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  define: {
    'process.env.GITHUB_OWNER': JSON.stringify(process.env.GITHUB_OWNER || 'ArminDashti'),
    'process.env.GITHUB_REPO': JSON.stringify(process.env.GITHUB_REPO || 'Sauron'),
    'process.env.SAURON_BUNDLE_NAME': JSON.stringify(process.env.SAURON_BUNDLE_NAME || 'Sauron'),
  },
});
