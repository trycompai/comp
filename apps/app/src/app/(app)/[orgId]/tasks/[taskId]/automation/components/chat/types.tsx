import type { DataPart } from '@/ai/messages/data-parts';
import type { Metadata } from '@/ai/messages/metadata';
import type { TaskAutomationToolSet } from '@/ai/tools/task-automation-tools';
import type { UIMessage } from 'ai';

export type ChatUIMessage = UIMessage<Metadata, DataPart, TaskAutomationToolSet>;
