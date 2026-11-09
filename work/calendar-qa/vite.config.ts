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
      { find: /^expo-router$/, replacement: fileURLToPath(new URL('./src/routerShim.tsx', import.meta.url)) },
      {
        find: /^\.\.\/\.\.\/\.\.\/\.\.\/core\/theme\/ThemeProvider$/,
        replacement: fileURLToPath(new URL('./src/themeShim.tsx', import.meta.url)),
      },
      {
        find: /^\.\.\/hooks\/useMonthlyCalendarRecords$/,
        replacement: fileURLToPath(new URL('./src/calendarFixtures.ts', import.meta.url)),
      },
      {
        find: /^(?:\.\.\/){3}holidays\/presentation\/hooks\/useCalendarHolidays$/,
        replacement: fileURLToPath(new URL('./src/calendarFixtures.ts', import.meta.url)),
      },
      {
        find: /^\.\.\.\/\.\.\.\/\.\.\.\/ui\/theme$/,
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
    port: 5178,
    strictPort: true,
  },
});
