import type { DataPart } from '@/ai/messages/data-parts';
import type { Metadata } from '@/ai/messages/metadata';
import type { TaskAutomationToolSet } from '@/ai/tools/task-automation-tools';
import type { UIMessage } from 'ai';
import { memo } from 'react';
import { CreateSandbox } from './create-sandbox';
import { GenerateFiles } from './generate-files';
import { GetSandboxURL } from './get-sandbox-url';
import { PromptInfo } from './prompt-info';
import { PromptSecret } from './prompt-secret';
import { Reasoning } from './reasoning';
import { ReportErrors } from './report-errors';
import { ResearchActivity } from './research-activity';
import { RunCommand } from './run-command';
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
  if (part.type === 'data-generating-files') {
    return <GenerateFiles message={part.data} />;
  } else if (part.type === 'data-create-sandbox') {
    return <CreateSandbox message={part.data} />;
  } else if (part.type === 'data-get-sandbox-url') {
    return <GetSandboxURL message={part.data} />;
  } else if (part.type === 'data-run-command') {
    return <RunCommand message={part.data} />;
  } else if (part.type === 'reasoning') {
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
  }
  return null;
});
