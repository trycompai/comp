'use client';

import { useTaskComments } from '@/hooks/use-comments-api';
import { Separator } from '@comp/ui/separator';
import { CommentEntityType, type Task } from '@db';
import { T } from 'gt-next';
import { useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { CommentForm } from '../../../../../../components/comments/CommentForm';
import { CommentList } from '../../../../../../components/comments/CommentList';
import { updateTask } from '../../actions/updateTask';
import { TaskBody } from './TaskBody';

interface TaskMainContentProps {
  task: Task & { fileUrls?: string[] };
}

export function TaskMainContent({ task }: TaskMainContentProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');

  // Use SWR to fetch comments with real-time updates
  const {
    data: commentsData,
    error: commentsError,
    isLoading: commentsLoading,
    mutate: refreshComments,
  } = useTaskComments(task.id);

  // Extract comments from SWR response
  const comments = commentsData?.data || [];

  const debouncedUpdateTask = useDebouncedCallback(
    (field: 'title' | 'description', value: string) => {
      updateTask({ id: task.id, [field]: value });
    },
    1000,
  );

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? '');
  }, [task.title, task.description]);

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = event.target.value;
    setTitle(newTitle);
    debouncedUpdateTask('title', newTitle);
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = event.target.value;
    setDescription(newDescription);
    debouncedUpdateTask('description', newDescription);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 lg:mx-auto lg:max-w-3xl">
      <TaskBody
        taskId={task.id}
        title={title}
        description={description}
        onTitleChange={handleTitleChange}
        onDescriptionChange={handleDescriptionChange}
      />

      <div className="py-4">
        <Separator />
      </div>

      {/* Comment Section */}
      <div className="space-y-4">
        <T>
          <h3 className="text-lg font-medium">Comments</h3>
        </T>
        <CommentForm entityId={task.id} entityType={CommentEntityType.task} />

        {commentsLoading && (
          <div className="space-y-3">
            {/* Simple comment skeletons */}
            {[1, 2].map((i) => (
              <div key={i} className="bg-muted/20 rounded-lg h-16 animate-pulse"></div>
            ))}
          </div>
        )}

        {commentsError && (
          <T>
            <div className="text-destructive text-sm">
              Failed to load comments. Please try again.
            </div>
          </T>
        )}

        {!commentsLoading && !commentsError && (
          <CommentList comments={comments} refreshComments={refreshComments} />
        )}
      </div>
    </div>
  );
}
