import { Sandbox } from '@vercel/sandbox';
import type { UIMessage, UIMessageStreamWriter } from 'ai';
import { tool } from 'ai';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import z from 'zod/v3';
import type { DataPart } from '../messages/data-parts';
import { getContents, type File } from './generate-files/get-contents';
import { getWriteFiles } from './generate-files/get-write-files';
import { getRichError } from './get-rich-error';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const description = readFileSync(join(__dirname, 'generate-files.md'), 'utf8');

interface Params {
  modelId: string;
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
}

export const generateFiles = ({ writer, modelId }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      sandboxId: z.string(),
      paths: z.array(z.string()),
    }),
    execute: async ({ sandboxId, paths }, { toolCallId, messages }) => {
      writer.write({
        id: toolCallId,
        type: 'data-generating-files',
        data: { paths: [], status: 'generating' },
      });

      let sandbox: Sandbox | null = null;

      try {
        sandbox = await Sandbox.get({ sandboxId });
      } catch (error) {
        const richError = getRichError({
          action: 'get sandbox by id',
          args: { sandboxId },
          error,
        });

        writer.write({
          id: toolCallId,
          type: 'data-generating-files',
          data: { error: richError.error, paths: [], status: 'error' },
        });

        return richError.message;
      }

      const writeFiles = getWriteFiles({ sandbox, toolCallId, writer });
      const iterator = getContents({ messages, modelId, paths });
      const uploaded: File[] = [];

      try {
        for await (const chunk of iterator) {
          if (chunk.files.length > 0) {
            const error = await writeFiles(chunk);
            if (error) {
              return error;
            } else {
              uploaded.push(...chunk.files);
            }
          } else {
            writer.write({
              id: toolCallId,
              type: 'data-generating-files',
              data: {
                status: 'generating',
                paths: chunk.paths,
              },
            });
          }
        }
      } catch (error) {
        const richError = getRichError({
          action: 'generate file contents',
          args: { modelId, paths },
          error,
        });

        writer.write({
          id: toolCallId,
          type: 'data-generating-files',
          data: {
            error: richError.error,
            status: 'error',
            paths,
          },
        });

        return richError.message;
      }

      writer.write({
        id: toolCallId,
        type: 'data-generating-files',
        data: { paths: uploaded.map((file) => file.path), status: 'done' },
      });

      return `Successfully generated and uploaded ${
        uploaded.length
      } files. Their paths and contents are as follows:
        ${uploaded.map((file) => `Path: ${file.path}\nContent: ${file.content}\n`).join('\n')}`;
    },
  });
