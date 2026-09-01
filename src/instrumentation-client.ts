import * as Sentry from '@sentry/nextjs';

import { sentryBaseOptions } from '@/lib/observability';

Sentry.init({ ...sentryBaseOptions });

// Lets the SDK measure client-side navigations. Harmless when disabled.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
