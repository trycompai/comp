import { getModelOptions } from '@/ai/gateway';
import { streamObject, type ModelMessage } from 'ai';
import z from 'zod/v3';
import { Deferred } from '../../../app/(app)/[orgId]/tasks/[taskId]/automations/lib/deferred';

export type File = z.infer<typeof fileSchema>;

const fileSchema = z.object({
  path: z
    .string()
    .describe(
      "Path to the file in the Vercel Sandbox (relative paths from sandbox root, e.g., 'src/main.js', 'package.json', 'components/Button.tsx')",
    ),
  content: z
    .string()
    .describe(
      'The content of the file as a utf8 string (complete file contents that will replace any existing file at this path)',
    ),
});

interface Params {
  messages: ModelMessage[];
  modelId: string;
  paths: string[];
}

interface FileContentChunk {
  files: z.infer<typeof fileSchema>[];
  paths: string[];
  written: string[];
}

export async function* getContents(params: Params): AsyncGenerator<FileContentChunk> {
  const generated: z.infer<typeof fileSchema>[] = [];
  const deferred = new Deferred<void>();
  const result = streamObject({
    ...getModelOptions(params.modelId, { reasoningEffort: 'minimal' }),
    system:
      "You are a file content generator. You must generate files based on the conversation history and the provided paths. NEVER generate lock files (pnpm-lock.yaml, package-lock.json, yarn.lock) - these are automatically created by package managers.\n\nSTRICT LAMBDA RULES:\nFor any file whose path matches /^lambdas\\\/.*\\.js$/, you MUST adhere to ALL of the following or REGENERATE until compliant:\n1) The first non-whitespace characters in the file MUST be: module.exports = async (event) => {\n2) There MUST be NO code, comments, imports, or variables outside the exported function (neither before nor after)\n3) All require(...) and helper functions MUST be inside the exported function\n4) Do NOT use process.env for secrets. Use getSecret inside the function.\n5) Output raw file contents only (no markdown fences).\n6) Networking: ONLY use global fetch. NEVER use https/http/node:https/node:http/axios/node-fetch.\n\nDISALLOWED EXAMPLE (never produce):\n// comment\nconst https = require('https');\nmodule.exports = async (event) => { /* ... */ };\n\nALLOWED SHAPE (example):\nmodule.exports = async (event) => {\n  const u = new URL('https://api.example.com/resource');\n  const res = await fetch(u);\n  const data = await res.json();\n  return { ok: true, data };\n};",
    messages: [
      ...params.messages,
      {
        role: 'user',
        content: `Generate the content of the following files according to the conversation: ${params.paths.map(
          (path) => `\n - ${path}`,
        )}`,
      },
    ],
    schema: z.object({ files: z.array(fileSchema) }),
    onError: (error) => {
      deferred.reject(error);
      console.error('Error communicating with AI');
      console.error(JSON.stringify(error, null, 2));
    },
  });

  for await (const items of result.partialObjectStream) {
    if (!Array.isArray(items?.files)) {
      continue;
    }

    const written = generated.map((file) => file.path);
    const paths = written.concat(
      items.files
        .slice(generated.length, items.files.length - 1)
        .flatMap((f) => (f?.path ? [f.path] : [])),
    );

    const files = items.files
      .slice(generated.length, items.files.length - 2)
      .map((file) => fileSchema.parse(file));

    if (files.length > 0) {
      yield { files, paths, written };
      generated.push(...files);
    } else {
      yield { files: [], written, paths };
    }
  }

  const raceResult = await Promise.race([result.object, deferred.promise]);
  if (!raceResult) {
    throw new Error('Unexpected Error: Deferred was resolved before the result');
  }

  const written = generated.map((file) => file.path);
  const files = raceResult.files.slice(generated.length);
  const paths = written.concat(files.map((file) => file.path));
  if (files.length > 0) {
    yield { files, written, paths };
    generated.push(...files);
  }
}
