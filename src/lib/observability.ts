/**
 * Error monitoring is off until a DSN is provided (Docs/6 Phase 11 §4). With
 * no DSN, `Sentry.init` is a documented no-op and the build skips the Sentry
 * wrapper entirely — zero cost, nothing to break. Set `NEXT_PUBLIC_SENTRY_DSN`
 * (plus `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` for source-map
 * upload) in the environment to turn it on.
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Errors only for the MVP — no performance tracing, no session replay. Both
// have a cost and a privacy footprint we don't need yet.
export const sentryBaseOptions = {
  dsn: SENTRY_DSN,
  // A religious institution's site, a Canadian charity: never attach request
  // bodies, headers, cookies or user identifiers to an event.
  sendDefaultPii: false,
  tracesSampleRate: 0,
  enabled: Boolean(SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
} as const;
