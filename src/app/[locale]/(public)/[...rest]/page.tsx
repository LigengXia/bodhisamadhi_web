import { notFound } from 'next/navigation';

// Any unmatched path under a locale falls through to here and renders the
// §6.1 404 inside the public chrome. next-intl's own not-found.tsx cannot see
// the locale param; a catch-all page can (Docs/7 §4.1).
export default function CatchAll() {
  notFound();
}
