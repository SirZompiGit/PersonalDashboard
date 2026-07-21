import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Firebase pesa circa quanto tutto il resto dell'app messo insieme.
        // Tenerlo in un file a parte evita di reinvalidarne la cache a ogni
        // modifica del codice, e chi usa solo la modalità Lite lo scarica una
        // volta sola.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/database'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
