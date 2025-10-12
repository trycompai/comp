/**
 * Task Automation Tools
 *
 * A limited set of AI tools specifically for task automation.
 * Only includes tools necessary for creating and storing automation scripts.
 */

import type { InferUITools, UIMessage, UIMessageStreamWriter } from 'ai';
import type { DataPart } from '../lib/types/data-parts';
import { exaSearchTool } from './exa-search';
import { firecrawlTool } from './firecrawl';
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
 * - exaSearch: For searching the web using Exa AI's neural search
 * - firecrawl: For crawling and extracting content from websites
 */
export function getTaskAutomationTools() {
  return {
    storeToS3: storeToS3(),
    promptForSecret: promptForSecretTool(),
    promptForInfo: promptForInfoTool(),
    exaSearch: exaSearchTool(),
    firecrawl: firecrawlTool(),
  };
}

export type TaskAutomationToolSet = InferUITools<ReturnType<typeof getTaskAutomationTools>>;
