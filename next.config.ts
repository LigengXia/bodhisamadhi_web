import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Portable build — no Vercel-only APIs. AWS-vs-Vercel hosting is unresolved
  // (CLAUDE.md § Known unresolved). `standalone` produces a self-contained
  // server for a container / AWS, but it breaks Vercel's own build adapter
  // (missing `.next/next-server.js.nft.json`), so it is disabled when building
  // on Vercel. The portability guarantee that matters — no Vercel-only APIs —
  // holds regardless of this flag.
  output: process.env.VERCEL ? undefined : 'standalone',

  // Cache Components stays opt-in / off for the MVP (Docs/3 §11).
  reactStrictMode: true,

  // Next 16 blocks cross-origin requests to dev resources (HMR) by default.
  // Playwright drives the dev server over 127.0.0.1; without this the HMR
  // socket is refused and client components can be interacted with before
  // they hydrate.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],

  // `next dev` otherwise rewrites CLAUDE.md / AGENTS.md on every run with a
  // managed "agent rules" block. CLAUDE.md here is the project's own
  // hand-authored specification pointer — the bundler must not touch it.
  // (The Next 16 breaking-change notes it points at are captured in Docs/3 §11.)
  agentRules: false,
};

const config = withNextIntl(nextConfig);

// Sentry only wraps the build when a DSN is set (Docs/6 Phase 11 §4). Without
// one, the SDK's init() is already a no-op; skipping the wrapper too keeps the
// build clean and the `/monitoring` tunnel route out of the app.
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(config, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN, // omit → source maps not uploaded
      tunnelRoute: '/monitoring', // dodge ad-blockers
      silent: !process.env.CI,
      telemetry: false,
    })
  : config;
