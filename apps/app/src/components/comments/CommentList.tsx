import { CommentItem } from './CommentItem';
import { CommentWithAuthor } from './Comments';

export function CommentList({
  comments,
  refreshComments,
  readOnly = false,
}: {
  comments: CommentWithAuthor[];
  refreshComments: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} refreshComments={refreshComments} readOnly={readOnly} />
      ))}
    </div>
  );
}
