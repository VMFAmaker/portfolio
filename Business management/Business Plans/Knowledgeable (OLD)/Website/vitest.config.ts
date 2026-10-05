import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Rules tests need the Firebase emulators, so they only run via `npm run test:rules`
// (which starts the emulators and sets FIRESTORE_EMULATOR_HOST).
const withEmulators = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

export default defineConfig({
  test: {
    environment: 'node',
    include: withEmulators ? ['rules-tests/**/*.test.ts'] : ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
