/**
 * Task Automation Tools
 *
 * A limited set of AI tools specifically for task automation.
 * Only includes tools necessary for creating and storing automation scripts.
 */

import type { InferUITools, UIMessage, UIMessageStreamWriter } from 'ai';
import type { DataPart } from '../messages/data-parts';
import { promptForInfoTool } from './prompt-for-info';
import { promptForSecretTool } from './prompt-for-secret';
import { storeToS3 } from './store-to-s3';

interface Params {
  modelId: string;
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
}

/**
 * Get task automation specific tools
 * Includes:
 * - storeToS3: For saving scripts directly
 * - promptForSecret: For requesting missing secrets from users
 * - promptForInfo: For requesting missing information/parameters from users
 */
export function getTaskAutomationTools({ modelId, writer }: Params) {
  return {
    storeToS3: storeToS3({ writer }),
    promptForSecret: promptForSecretTool(),
    promptForInfo: promptForInfoTool(),
  };
}

export type TaskAutomationToolSet = InferUITools<ReturnType<typeof getTaskAutomationTools>>;
