import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/EmptyState/EmptyState';
import type { Locale } from '@/i18n/routing';
import type { CommentNode } from '@/lib/content/comments';

import { Comment } from './Comment';

type Props = {
  nodes: CommentNode[];
  locale: Locale;
  itemPath: string;
  contentItemId: string;
  viewerSignedIn: boolean;
};

/**
 * The rendered thread (Docs/10 §5.2). No data fetch — the parent
 * `CommentsSection` fetches and folds the rows. A synchronous Server Component,
 * like `Comment`: nothing to await, and `useTranslations` works here.
 *
 * Empty → the §7.7 verbatim empty state. Otherwise one `<Comment>` per
 * top-level node; `Comment` renders its own replies one level deep.
 */
export function CommentList({
  nodes,
  locale,
  itemPath,
  contentItemId,
  viewerSignedIn,
}: Props) {
  const t = useTranslations('comments');

  if (nodes.length === 0) {
    return (
      <EmptyState level={3} heading={t('emptyHeading')} body={t('emptyBody')} />
    );
  }

  return (
    <div>
      {nodes.map((node) => (
        <Comment
          key={node.id}
          node={node}
          locale={locale}
          itemPath={itemPath}
          contentItemId={contentItemId}
          viewerSignedIn={viewerSignedIn}
        />
      ))}
    </div>
  );
}
