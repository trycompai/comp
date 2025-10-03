import { tool } from 'ai';
import { z } from 'zod';

const promptForSecretSchema = z.object({
  secretName: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Z0-9_]+$/, 'Name must be uppercase letters, numbers, and underscores only'),
  description: z.string().optional(),
  category: z.string().optional(),
  exampleValue: z.string().optional(),
  reason: z.string().describe('Explain why this secret is needed for the automation'),
});

export const promptForSecretTool = () =>
  tool({
    description:
      'Prompt the user to add a secret that is required for the automation but not currently configured',
    inputSchema: promptForSecretSchema,
    execute: async (args: unknown) => {
      const { secretName, description, category, exampleValue, reason } =
        promptForSecretSchema.parse(args);

      // Return a special response that the frontend will recognize
      // The message will be shown to the user and parsed by the chat component
      return `[SECRET_REQUIRED]
Secret Name: ${secretName}
Description: ${description || 'No description provided'}
Category: ${category || 'automation'}
Example: ${exampleValue || 'No example provided'}
Reason: ${reason}
[/SECRET_REQUIRED]

I need the secret "${secretName}" to create this automation. ${reason}

Please click the button above to add this secret, then let me know when you've added it so I can continue.`;
    },
  });
