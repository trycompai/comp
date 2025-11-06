import type { UIMessage } from 'ai';
import { memo } from 'react';
import { DataPart } from '../../../lib/types/data-parts';
import { Metadata } from '../../../lib/types/metadata';
import { TaskAutomationToolSet } from '../../../tools/task-automation-tools';
import { FileWritingActivity } from './file-writing-activity';
import { PromptInfo } from './prompt-info';
import { PromptSecret } from './prompt-secret';
import { Reasoning } from './reasoning';
import { ReportErrors } from './report-errors';
import { ResearchActivity } from './research-activity';
import { Text } from './text';

interface Props {
  part: UIMessage<Metadata, DataPart, TaskAutomationToolSet>['parts'][number];
  partIndex: number;
  orgId?: string;
  onSecretAdded?: (secretName: string) => void;
  onInfoProvided?: (info: Record<string, string>) => void;
}

export const MessagePart = memo(function MessagePart({
  part,
  partIndex,
  orgId,
  onSecretAdded,
  onInfoProvided,
}: Props) {
  if (part.type === 'reasoning') {
    return <Reasoning part={part} partIndex={partIndex} />;
  } else if (part.type === 'data-report-errors') {
    return <ReportErrors message={part.data} />;
  } else if (part.type === 'text') {
    return <Text part={part} />;
  } else if (part.type === 'tool-promptForSecret') {
    return (
      <PromptSecret
        input={part.input}
        output={part.output}
        state={part.state}
        errorText={part.errorText}
        orgId={orgId || ''}
        onSecretAdded={onSecretAdded}
      />
    );
  } else if (part.type === 'tool-promptForInfo') {
    return (
      <PromptInfo
        input={part.input}
        output={part.output}
        state={part.state}
        errorText={part.errorText}
        onInfoProvided={onInfoProvided}
      />
    );
  } else if (part.type === 'tool-exaSearch' || part.type === 'tool-firecrawl') {
    return (
      <ResearchActivity
        toolName={part.type === 'tool-exaSearch' ? 'exaSearch' : 'firecrawl'}
        input={part.input}
        state={part.state}
        output={part.output}
        isAnimating={partIndex === 0}
      />
    );
  } else if (part.type === 'tool-storeToS3') {
    return (
      <FileWritingActivity
        input={part.input}
        state={part.state}
        output={part.output}
        isAnimating={partIndex === 0}
      />
    );
  }
  return null;
});
