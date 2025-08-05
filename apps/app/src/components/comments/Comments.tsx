import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
// Removed unused database model imports
import { CommentEntityType } from '@db';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';

export type CommentWithAuthor = {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  attachments: Array<{
    id: string;
    name: string;
    type: string;
    downloadUrl: string;
    createdAt: string;
  }>;
  createdAt: string;
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
        <CommentList comments={comments} refreshComments={() => {}} />
        <CommentForm entityId={entityId} entityType={entityType} />
      </CardContent>
    </Card>
  );
};
