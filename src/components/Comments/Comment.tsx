import { useTranslations } from 'next-intl';
import clsx from 'clsx';

import { Avatar } from '@/components/Avatar/Avatar';
import { Badge } from '@/components/Badge/Badge';
import type { Locale } from '@/i18n/routing';
import type { CommentNode, CommentRow } from '@/lib/content/comments';
import { formatDate, formatRelativeTime } from '@/lib/format';

import { CommentActions } from './CommentActions';
import styles from './Comment.module.css';

type Props = {
  node: CommentNode | CommentRow;
  locale: Locale;
  itemPath: string;
  contentItemId: string;
  viewerSignedIn: boolean;
  isReply?: boolean;
};

function isNode(node: CommentNode | CommentRow): node is CommentNode {
  return Array.isArray((node as CommentNode).replies);
}

/**
 * A single rendered comment (Docs/4 §3.18, Docs/10 §5.3). A synchronous Server
 * Component — it has nothing to await, and staying sync keeps the reply
 * subtree (and the component test) simple. `useTranslations` works in a sync
 * Server Component.
 *
 * A top-level node renders its `replies` one level deep; a reply (`isReply`)
 * never renders children — defence in depth behind `enforce_single_reply_level`.
 */
export function Comment({
  node,
  locale,
  itemPath,
  contentItemId,
  viewerSignedIn,
  isReply = false,
}: Props) {
  const t = useTranslations('comments');

  const isPending = node.status === 'pending';
  const isApproved = node.status === 'approved';
  const canReply = !isReply && viewerSignedIn;
  const replies = !isReply && isNode(node) ? node.replies : [];

  return (
    <article
      id={`comment-${node.id}`}
      className={clsx(styles.comment, isPending && styles.pending)}
    >
      <div className={styles.head}>
        <Avatar size={32} name={node.authorName} src={node.authorAvatar} />
        <span className={styles.author}>{node.authorName}</span>
        {node.authorIsMaster && (
          <Badge variant="master" upper={locale === 'en'}>
            {t('masterBadge')}
          </Badge>
        )}
        {isPending && (
          <Badge variant="statusPending" upper={locale === 'en'}>
            {t('pendingBadge')}
          </Badge>
        )}
        <time
          className={styles.time}
          dateTime={node.createdAt}
          title={formatDate(node.createdAt, locale)}
        >
          {formatRelativeTime(node.createdAt, locale)}
        </time>
      </div>

      <p className={styles.body}>{node.body}</p>

      {isPending && <p className={styles.hint}>{t('pendingHint')}</p>}

      <CommentActions
        commentId={node.id}
        contentItemId={contentItemId}
        itemPath={itemPath}
        isOwn={node.isOwn}
        canReply={canReply}
        isApproved={isApproved}
        viewerSignedIn={viewerSignedIn}
      />

      {replies.length > 0 && (
        <div className={styles.replies}>
          {replies.map((reply) => (
            <Comment
              key={reply.id}
              node={reply}
              locale={locale}
              itemPath={itemPath}
              contentItemId={contentItemId}
              viewerSignedIn={viewerSignedIn}
              isReply
            />
          ))}
        </div>
      )}
    </article>
  );
}
