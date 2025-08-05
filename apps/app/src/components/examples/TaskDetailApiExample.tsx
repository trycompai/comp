'use client';

import {
  useCommentWithAttachments,
  useTask,
  useTaskAttachmentActions,
  useTaskAttachments,
  useTaskCommentActions,
  useTaskComments,
} from '@/hooks/use-tasks-api';
import React, { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

interface TaskDetailApiExampleProps {
  taskId: string;
}

/**
 * Example component showing how to use the Tasks API with SWR
 *
 * Features demonstrated:
 * - Loading task details with SWR caching
 * - Real-time attachment management
 * - Comment system with file attachments
 * - Error handling and loading states
 * - Optimistic updates with cache revalidation
 */
export function TaskDetailApiExample({ taskId }: TaskDetailApiExampleProps) {
  const [newComment, setNewComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==================== SWR DATA FETCHING ====================

  const { data: taskData, error: taskError, isLoading: taskLoading } = useTask(taskId);

  const {
    data: attachmentsData,
    error: attachmentsError,
    isLoading: attachmentsLoading,
    mutate: refreshAttachments,
  } = useTaskAttachments(taskId);

  const {
    data: commentsData,
    error: commentsError,
    isLoading: commentsLoading,
    mutate: refreshComments,
  } = useTaskComments(taskId);

  // ==================== API ACTIONS ====================

  const { uploadAttachment, deleteAttachment } = useTaskAttachmentActions(taskId);
  const { createComment, updateComment, deleteComment } = useTaskCommentActions(taskId);
  const { createCommentWithFiles } = useCommentWithAttachments(taskId);

  // ==================== HANDLERS ====================

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleUploadAttachment = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of selectedFiles) {
        await uploadAttachment(file, `Uploaded via API: ${file.name}`);
        toast.success(`Uploaded ${file.name}`);
      }

      // Refresh attachments list
      refreshAttachments();

      // Clear selection
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, fileName: string) => {
    try {
      await deleteAttachment(attachmentId);
      toast.success(`Deleted ${fileName}`);
      refreshAttachments();
    } catch (error) {
      toast.error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCreateComment = async () => {
    if (!newComment.trim()) return;

    try {
      if (selectedFiles.length > 0) {
        // Create comment with file attachments
        await createCommentWithFiles(newComment, selectedFiles);
        toast.success('Comment with attachments created!');
      } else {
        // Create comment without attachments
        await createComment({ content: newComment });
        toast.success('Comment created!');
      }

      // Clear form and refresh comments
      setNewComment('');
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      refreshComments();
    } catch (error) {
      toast.error(
        `Failed to create comment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      toast.success('Comment deleted!');
      refreshComments();
    } catch (error) {
      toast.error(
        `Failed to delete comment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  // ==================== RENDER ====================

  if (taskLoading) return <div className="p-4">Loading task...</div>;
  if (taskError)
    return <div className="p-4 text-red-600">Error loading task: {taskError.message}</div>;
  if (!taskData?.data) return <div className="p-4">Task not found</div>;

  const task = taskData.data;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* ==================== TASK DETAILS ==================== */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h1>
        {task.description && <p className="text-gray-600 mb-4">{task.description}</p>}
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Status: {task.status}</span>
          {task.priority && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
              Priority: {task.priority}
            </span>
          )}
        </div>
      </div>

      {/* ==================== ATTACHMENTS SECTION ==================== */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Attachments</h2>

        {/* Upload Section */}
        <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="mb-2"
            accept="image/*,application/pdf,.doc,.docx,.txt"
          />
          {selectedFiles.length > 0 && (
            <div className="mb-2">
              <p className="text-sm text-gray-600">Selected files:</p>
              <ul className="text-sm text-gray-500">
                {selectedFiles.map((file, index) => (
                  <li key={index}>
                    • {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={handleUploadAttachment}
            disabled={selectedFiles.length === 0 || isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>

        {/* Attachments List */}
        {attachmentsLoading && <div>Loading attachments...</div>}
        {attachmentsError && (
          <div className="text-red-600">Error loading attachments: {attachmentsError.message}</div>
        )}
        {attachmentsData?.data && attachmentsData.data.length > 0 ? (
          <div className="space-y-2">
            {attachmentsData.data.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 border rounded"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-blue-600">📎</span>
                  <div>
                    <a
                      href={attachment.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {attachment.name}
                    </a>
                    {attachment.description && (
                      <p className="text-sm text-gray-500">{attachment.description}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(attachment.createdAt).toLocaleDateString()}
                      {attachment.size && ` • ${(attachment.size / 1024).toFixed(1)} KB`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteAttachment(attachment.id, attachment.name)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No attachments yet</p>
        )}
      </div>

      {/* ==================== COMMENTS SECTION ==================== */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Comments</h2>

        {/* Add Comment Form */}
        <div className="mb-6 space-y-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full p-3 border rounded-md resize-none"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {selectedFiles.length > 0 && (
                <span>{selectedFiles.length} file(s) will be attached</span>
              )}
            </div>
            <button
              onClick={handleCreateComment}
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Add Comment
            </button>
          </div>
        </div>

        {/* Comments List */}
        {commentsLoading && <div>Loading comments...</div>}
        {commentsError && (
          <div className="text-red-600">Error loading comments: {commentsError.message}</div>
        )}
        {commentsData?.data && commentsData.data.length > 0 ? (
          <div className="space-y-4">
            {commentsData.data.map((comment) => (
              <div key={comment.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{comment.author.name}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>

                <p className="text-gray-700 mb-3">{comment.content}</p>

                {/* Comment Attachments */}
                {comment.attachments.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600">Attachments:</p>
                    {comment.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center space-x-2 text-sm">
                        <span>📎</span>
                        <a
                          href={attachment.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {attachment.name}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No comments yet</p>
        )}
      </div>
    </div>
  );
}

/**
 * Usage Example:
 *
 * ```tsx
 * function TaskPage({ params }: { params: { taskId: string } }) {
 *   return <TaskDetailApiExample taskId={params.taskId} />;
 * }
 * ```
 */
