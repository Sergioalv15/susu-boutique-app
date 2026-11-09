import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const source = (path: string) => fileURLToPath(new URL(`../../../src/${path}`, import.meta.url));

export default defineConfig({
  root,
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      {
        find: /^react-native-safe-area-context$/,
        replacement: fileURLToPath(new URL('./src/safeAreaShim.tsx', import.meta.url)),
      },
      {
        find: /^@react-navigation\/elements$/,
        replacement: fileURLToPath(new URL('./src/navigationShim.tsx', import.meta.url)),
      },
      {
        find: /^expo-router$/,
        replacement: fileURLToPath(new URL('./src/routerShim.tsx', import.meta.url)),
      },
      {
        find: /^(?:\.\.\/)+core\/theme\/ThemeProvider$/,
        replacement: fileURLToPath(new URL('./src/themeShim.tsx', import.meta.url)),
      },
      {
        find: /^(?:\.\.\/){3}infrastructure\/container$/,
        replacement: fileURLToPath(new URL('./src/investmentFixtures.ts', import.meta.url)),
      },
      {
        find: /^(?:\.\.\/){4}suppliers\/presentation\/hooks\/useSuppliers$/,
        replacement: fileURLToPath(new URL('./src/supplierFixtures.ts', import.meta.url)),
      },
      {
        find: /^\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/ui\/theme$/,
        replacement: source('ui/theme.ts'),
      },
    ],
  },
  optimizeDeps: {
    include: ['react-native-web', '@react-native/normalize-colors'],
    force: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5180,
    strictPort: true,
  },
});
