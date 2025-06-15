"use client";

import { CommentEntityType, type Attachment, type Task } from "@comp/db/types";
import { Separator } from "@comp/ui/separator";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { updateTask } from "../../actions/updateTask";
import { TaskBody } from "./TaskBody";
import { CommentForm } from "../../../../../../components/comments/CommentForm";
import { CommentList } from "../../../../../../components/comments/CommentList";
import { CommentWithAuthor } from "../../../../../../components/comments/Comments";

interface TaskMainContentProps {
  task: Task & { fileUrls?: string[] };
  comments: CommentWithAuthor[];
  attachments: Attachment[];
}

export function TaskMainContent({
  task,
  comments,
  attachments,
}: TaskMainContentProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");

  const debouncedUpdateTask = useDebouncedCallback(
    (field: "title" | "description", value: string) => {
      updateTask({ id: task.id, [field]: value });
    },
    1000,
  );

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
  }, [task.title, task.description]);

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = event.target.value;
    setTitle(newTitle);
    debouncedUpdateTask("title", newTitle);
  };

  const handleDescriptionChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const newDescription = event.target.value;
    setDescription(newDescription);
    debouncedUpdateTask("description", newDescription);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 lg:mx-auto lg:max-w-3xl lg:py-8">
      <TaskBody
        taskId={task.id}
        title={title}
        description={description}
        attachments={attachments}
        onTitleChange={handleTitleChange}
        onDescriptionChange={handleDescriptionChange}
      />

      <div className="py-4">
        <Separator />
      </div>

      {/* Comment Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Comments</h3>
        <CommentForm entityId={task.id} entityType={CommentEntityType.task} />
        <CommentList comments={comments} />
      </div>
    </div>
  );
}
