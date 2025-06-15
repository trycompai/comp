import { CommentForm } from "./CommentForm";
import { CommentList } from "./CommentList";
import type { Comment } from "@comp/db/types";
import type { Member } from "@comp/db/types";
import type { User } from "@comp/db/types";
import type { Attachment } from "@comp/db/types";
import { CommentEntityType } from "@comp/db/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@comp/ui/card";

export type CommentWithAuthor = Comment & {
  author: Member & {
    user: User;
  };
  attachments: Attachment[];
};

export const Comments = ({
  entityId,
  entityType,
  comments,
}: {
  entityId: string;
  entityType: CommentEntityType;
  comments: CommentWithAuthor[];
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comments</CardTitle>
        <CardDescription>Leave a comment on this {entityType}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CommentList comments={comments} />
        <CommentForm entityId={entityId} entityType={entityType} />
      </CardContent>
    </Card>
  );
};
