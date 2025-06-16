import { CommentItem } from "./CommentItem";
import { CommentWithAuthor } from "./Comments";

export function CommentList({ comments }: { comments: CommentWithAuthor[] }) {
  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
}
