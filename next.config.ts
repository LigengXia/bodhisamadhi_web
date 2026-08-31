import type { NextConfig } from 'next';
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

  // `next dev` otherwise rewrites CLAUDE.md / AGENTS.md on every run with a
  // managed "agent rules" block. CLAUDE.md here is the project's own
  // hand-authored specification pointer — the bundler must not touch it.
  // (The Next 16 breaking-change notes it points at are captured in Docs/3 §11.)
  agentRules: false,
};

export default withNextIntl(nextConfig);
