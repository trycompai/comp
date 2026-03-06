import { CommentItem } from './CommentItem';
import type { CommentWithAuthor } from './Comments';

export function CommentList({
  comments,
  refreshComments,
  readOnly = false,
  entityType,
}: {
  comments: CommentWithAuthor[];
  refreshComments: () => void;
  readOnly?: boolean;
  entityType: string;
}) {
  return (
    <div className="space-y-2">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} refreshComments={refreshComments} readOnly={readOnly} entityType={entityType} />
      ))}
    </div>
  );
}
