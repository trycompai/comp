'use client';
import type { DataPart } from '@/ai/messages/data-parts';
import { CheckIcon, CloudUploadIcon, XIcon } from 'lucide-react';
import { useEffect } from 'react';
import { ToolHeader } from '../tool-header';
import { ToolMessage } from '../tool-message';
import { Spinner } from './spinner';

export function GenerateFiles(props: {
  className?: string;
  message: DataPart['generating-files'];
}) {
  const lastInProgress = ['error', 'uploading', 'generating'].includes(props.message.status);

  const generated = lastInProgress
    ? props.message.paths.slice(0, props.message.paths.length - 1)
    : props.message.paths;

  const generating = lastInProgress
    ? (props.message.paths[props.message.paths.length - 1] ?? '')
    : null;

  // Broadcast progress to filesystem overlay
  useEffect(() => {
    try {
      const path = typeof generating === 'string' ? generating : generated[generated.length - 1];
      if (props.message.status === 'generating') {
        window.dispatchEvent(new CustomEvent('sandbox:files-start', { detail: { path } }));
      } else if (props.message.status === 'done' || props.message.status === 'error') {
        window.dispatchEvent(new CustomEvent('sandbox:files-finish', { detail: { path } }));
      }
    } catch (_) {
      // noop
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.message.status, props.message.paths]);

  // Don't show the "Uploaded files" message in chat - users don't need to see file paths
  if (props.message.status === 'done') {
    return null;
  }

  return (
    <ToolMessage className={props.className}>
      <ToolHeader>
        <CloudUploadIcon className="w-3.5 h-3.5" />
        <span>Generating files</span>
      </ToolHeader>
      <div className="text-sm relative min-h-5 overflow-x-auto">
        {generated.map((path) => (
          <div className="flex items-center" key={'gen' + path}>
            <CheckIcon className="w-4 h-4 mx-1" />
            <span className="whitespace-pre-wrap break-all">{path}</span>
          </div>
        ))}
        {typeof generating === 'string' && (
          <div className="flex">
            <Spinner className="mr-1" loading={props.message.status !== 'error'}>
              {props.message.status === 'error' ? (
                <XIcon className="w-4 h-4 text-red-700" />
              ) : (
                <CheckIcon className="w-4 h-4" />
              )}
            </Spinner>
            <span>{generating}</span>
          </div>
        )}
        {/* Code writing animation is shown in the filesystem overlay, not in chat */}
      </div>
    </ToolMessage>
  );
}
