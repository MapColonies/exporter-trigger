import { defineConfig, type ViteUserConfig } from 'vitest/config';
import tsconfig from './tsconfig.json';
import path from 'path';

const pathAlias = Object.fromEntries(
  Object.entries(tsconfig.compilerOptions.paths).map(([key, [value]]) => [key.replace('/*', ''), path.resolve(__dirname, value.replace('/*', ''))])
);

// Some MapColonies packages only export under the "require" condition (CJS-only).
// Vitest/Vite 8 with rolldown uses "import" by default, so we resolve them explicitly.
const cjsOnlyPackages: Record<string, string> = {
  '@map-colonies/raster-shared': path.resolve(__dirname, 'node_modules/@map-colonies/raster-shared/dist/index.js'),
};

const reporters: Exclude<ViteUserConfig['test'], undefined>['reporters'] = ['default', 'html'];

if (process.env.GITHUB_ACTIONS) {
  reporters.push('github-actions');
}

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        test: {
          name: 'unit',
          globals: true,
          setupFiles: ['./tests/configurations/initJestOpenapi.setup.ts', './tests/configurations/vite.setup.ts'],
          include: ['tests/unit/**/*.spec.ts'],
          environment: 'node',
        },
        resolve: {
          alias: { ...pathAlias, ...cjsOnlyPackages },
        },
      },
      {
        test: {
          name: 'integration',
          globals: true,
          setupFiles: ['./tests/configurations/initJestOpenapi.setup.ts', './tests/configurations/vite.setup.ts'],
          include: ['tests/integration/**/*.spec.ts'],
          environment: 'node',
        },
        resolve: {
          alias: { ...pathAlias, ...cjsOnlyPackages },
        },
      },
    ],
    reporters,
    coverage: {
      enabled: true,
      reporter: ['text', 'html', 'json', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['**/vendor/**', 'node_modules/**'],
      reportOnFailure: true,
      thresholds: {
        global: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
});
