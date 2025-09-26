import { CommentItem } from './CommentItem';
import { CommentWithAuthor } from './Comments';

export function CommentList({
  comments,
  refreshComments,
}: {
  comments: CommentWithAuthor[];
  refreshComments: () => void;
}) {
  return (
    <div className="space-y-2">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} refreshComments={refreshComments} />
      ))}
    </div>
  );
}
