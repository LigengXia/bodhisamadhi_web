// Flat config — `next lint` was removed in Next 16 (Docs/3 §11); ESLint is
// invoked directly via `npm run lint` and in CI.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    // eslint-plugin-react@7.37.5 (bundled by eslint-config-next@16.3.3) still
    // calls the removed `context.getFilename()` when auto-detecting the React
    // version, which throws under ESLint 10. Pinning the version here skips
    // detection entirely. React is pinned at 19.2.8 in Docs/3 §4.
    settings: {
      react: { version: '19.2.8' },
    },
  },
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'next-env.d.ts',
      'node_modules/**',
    ],
  },
];

export default config;
