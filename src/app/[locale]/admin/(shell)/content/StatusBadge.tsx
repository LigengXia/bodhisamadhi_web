import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/Badge/Badge';
import type { Database } from '@/types/database';

const MAP = {
  draft: { variant: 'statusOff', key: 'statusDraft' },
  published: { variant: 'statusOk', key: 'statusPublished' },
  archived: { variant: 'statusOff', key: 'statusDraft' },
} as const;

export async function StatusBadge({
  status,
}: {
  status: Database['public']['Enums']['content_status'];
}) {
  const t = await getTranslations('admin.content');
  const { variant, key } = MAP[status];
  return <Badge variant={variant}>{t(key)}</Badge>;
}
