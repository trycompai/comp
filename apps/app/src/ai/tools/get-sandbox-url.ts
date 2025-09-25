import { Sandbox } from '@vercel/sandbox';
import type { UIMessage, UIMessageStreamWriter } from 'ai';
import { tool } from 'ai';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import z from 'zod/v3';
import type { DataPart } from '../messages/data-parts';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const description = readFileSync(join(__dirname, 'get-sandbox-url.md'), 'utf8');

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
}

export const getSandboxURL = ({ writer }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      sandboxId: z
        .string()
        .describe(
          "The unique identifier of the Vercel Sandbox (e.g., 'sbx_abc123xyz'). This ID is returned when creating a Vercel Sandbox and is used to reference the specific sandbox instance.",
        ),
      port: z
        .number()
        .describe(
          'The port number where a service is running inside the Vercel Sandbox (e.g., 3000 for Next.js dev server, 8000 for Python apps, 5000 for Flask). The port must have been exposed when the sandbox was created or when running commands.',
        ),
    }),
    execute: async ({ sandboxId, port }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: 'data-get-sandbox-url',
        data: { status: 'loading' },
      });

      const sandbox = await Sandbox.get({ sandboxId });
      const url = sandbox.domain(port);

      writer.write({
        id: toolCallId,
        type: 'data-get-sandbox-url',
        data: { url, status: 'done' },
      });

      return { url };
    },
  });
