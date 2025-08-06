import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
// Removed unused database model imports
import { CommentEntityType } from '@db';
import { T, Var, useGT } from 'gt-next';
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
  const t = useGT();
  return (
    <Card>
      <CardHeader>
        <T>
          <CardTitle>Comments</CardTitle>
        </T>
        <T>
          <CardDescription>
            Leave a comment on this <Var>{entityType}</Var>
          </CardDescription>
        </T>
      </CardHeader>
      <CardContent className="space-y-4">
        <CommentList comments={comments} refreshComments={() => {}} />
        <CommentForm entityId={entityId} entityType={entityType} />
      </CardContent>
    </Card>
  );
};
