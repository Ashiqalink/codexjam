import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default {
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: { target: 'esnext', chunkSizeWarningLimit: 2000 },
};
