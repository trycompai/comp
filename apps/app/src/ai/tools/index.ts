import type { InferUITools, UIMessage, UIMessageStreamWriter } from 'ai';
import type { DataPart } from '../messages/data-parts';
import { createSandbox } from './create-sandbox';
import { generateFiles } from './generate-files';
import { getSandboxURL } from './get-sandbox-url';
import { runCommand } from './run-command';
import { storeToS3 } from './store-to-s3';

interface Params {
  modelId: string;
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
}

export function tools({ modelId, writer }: Params) {
  return {
    createSandbox: createSandbox({ writer }),
    generateFiles: generateFiles({ writer, modelId }),
    getSandboxURL: getSandboxURL({ writer }),
    runCommand: runCommand({ writer }),
    storeToS3: storeToS3({ writer }),
  };
}

export type ToolSet = InferUITools<ReturnType<typeof tools>>;
