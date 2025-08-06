'use client';

import { Separator } from '@comp/ui/separator';
import { CommentEntityType, type Task } from '@db';
import { useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Comments } from '../../../../../../components/comments/Comments';
import { updateTask } from '../../actions/updateTask';
import { TaskBody } from './TaskBody';

interface TaskMainContentProps {
  task: Task & { fileUrls?: string[] };
}

export function TaskMainContent({ task }: TaskMainContentProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');

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
      <Comments entityId={task.id} entityType={CommentEntityType.task} variant="inline" />
    </div>
  );
}
