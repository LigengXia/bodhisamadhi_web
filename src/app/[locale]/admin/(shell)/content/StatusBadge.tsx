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
  deleted = false,
}: {
  status: Database['public']['Enums']['content_status'];
  deleted?: boolean;
}) {
  const t = await getTranslations('admin.content');
  if (deleted) {
    return <Badge variant="statusOff">{t('statusDeleted')}</Badge>;
  }
  const { variant, key } = MAP[status];
  return <Badge variant={variant}>{t(key)}</Badge>;
}
