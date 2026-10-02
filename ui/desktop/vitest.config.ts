/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const cfg = {
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    // userEvent-driven jsdom tests regularly exceed the 5s default on loaded
    // CI runners; 15s keeps slow environments from flaking without masking
    // real assertion failures.
    testTimeout: 15000,
    hookTimeout: 15000,
  },
} satisfies Record<string, any>;

export default defineConfig(cfg as any);
