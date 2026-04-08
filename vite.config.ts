import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'react-native-ble-plx': 'react-native-web', // Mock for web
      'react-native-svg': 'react-native-svg', // Ensure it uses the main entry
      'react-native/Libraries/Utilities/codegenNativeComponent': '/src/mock.js',
    },
  },
  define: {
    global: 'window',
    __DEV__: JSON.stringify(true),
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
