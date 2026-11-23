import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { fileURLToPath, URL } from 'node:url';
import { IP_CONFIG } from './src/config/ipConfig.js';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vuetify({
      autoImport: true
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `${IP_CONFIG.protocol || 'http'}://${IP_CONFIG.serverIp}:${IP_CONFIG.serverPort || 3001}`,
        changeOrigin: true
      }
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom'
  }
});
