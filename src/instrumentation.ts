import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

// Captures errors thrown in Server Components, route handlers and `proxy.ts`.
// A no-op when Sentry is not configured.
export const onRequestError = Sentry.captureRequestError;
