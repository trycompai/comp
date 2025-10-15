import { tool } from 'ai';
import z from 'zod';

export const storeToS3 = () => {
  const config = {
    description: 'Real tool is defined in enterprise api',
    inputSchema: z.object({}),
    execute: async () => {},
  } as const;
  return tool(config as any);
};
