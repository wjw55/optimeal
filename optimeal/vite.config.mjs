import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const clientEnvironmentKeys = [
  'REACT_APP_MEAL_PLAN_ENDPOINT',
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID',
  'REACT_APP_FIREBASE_MEASUREMENT_ID'
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const define = Object.fromEntries(clientEnvironmentKeys.map((key) => [
    `process.env.${key}`,
    JSON.stringify(env[key] || '')
  ]));

  define['process.env.NODE_ENV'] = JSON.stringify(mode === 'production' ? 'production' : 'development');

  return {
    plugins: [react()],
    define,
    build: {
      outDir: 'build',
      sourcemap: false
    },
    test: {
      environment: 'node',
      globals: true,
      include: ['src/**/*.test.{js,jsx}']
    }
  };
});
