import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5340,
    proxy: {
      '/api': 'http://localhost:4340',
    },
  },
});
