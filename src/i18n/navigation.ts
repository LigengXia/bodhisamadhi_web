import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware navigation APIs. Components use these instead of `next/link`
// and `next/navigation` so the active locale is always carried.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
