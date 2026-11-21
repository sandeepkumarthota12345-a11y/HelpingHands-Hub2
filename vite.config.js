import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // In development the API runs separately (npm run server). If it is not running, the app uses browser-only mode.
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
