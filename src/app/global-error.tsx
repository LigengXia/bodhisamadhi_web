'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// The last-resort boundary — a crash in the root layout itself. It must render
// its own <html>/<body>. Copy is the §7.8 500 string, kept minimal since no
// locale context is available this far up.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily:
            'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
          background: '#fbf7f0',
          color: '#2e2a26',
          padding: '2rem',
        }}
      >
        <main style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.125rem', lineHeight: 1.6 }}>
            Something went wrong on our side. Please try again in a moment. If
            it keeps happening, please let us know at
            bodhisamadhicenter@gmail.com.
          </p>
        </main>
      </body>
    </html>
  );
}
