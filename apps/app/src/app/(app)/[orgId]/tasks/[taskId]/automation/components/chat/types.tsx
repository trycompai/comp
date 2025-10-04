import type { UIMessage } from 'ai';
import type { DataPart } from '../../lib/types/data-parts';
import { Metadata } from '../../lib/types/metadata';
import { TaskAutomationToolSet } from '../../tools/task-automation-tools';

export type ChatUIMessage = UIMessage<Metadata, DataPart, TaskAutomationToolSet>;
