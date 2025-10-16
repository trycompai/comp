import { tool } from 'ai';
import { z } from 'zod';

export const exaSearchTool = () =>
  tool({
    description: 'Real tool is defined in enterprise api',
    inputSchema: z.object({}),
    execute: async () => {},
  });
