import { tool } from 'ai';
import { z } from 'zod';

export function promptForInfoTool() {
  return tool({
    name: 'promptForInfo',
    description: 'Prompt the user to provide missing information needed for the automation',
    inputSchema: z.object({
      fields: z
        .array(
          z.object({
            name: z.string().describe('The field name (e.g., "github_org", "repo_name")'),
            label: z.string().describe('Human-readable label for the field'),
            description: z
              .string()
              .optional()
              .describe('Help text explaining what this field is for'),
            placeholder: z.string().optional().describe('Placeholder text for the input'),
            defaultValue: z.string().optional().describe('Default value if any'),
            required: z.boolean().default(true).describe('Whether this field is required'),
          }),
        )
        .describe('List of fields to prompt the user for'),
      reason: z.string().describe('Explanation of why this information is needed'),
    }),
    execute: async ({ fields, reason }) => {
      // Format the response in a way the frontend can parse
      const formattedFields = fields
        .map(
          (field) =>
            `Field: ${field.name}|${field.label}|${field.description || ''}|${field.placeholder || ''}|${field.defaultValue || ''}|${field.required}`,
        )
        .join('\n');

      return `[INFO_REQUIRED]
Reason: ${reason}
${formattedFields}
[/INFO_REQUIRED]

I need some additional information to create this automation. ${reason}

Please provide the required information above, then let me know when you've added it so I can continue.`;
    },
  });
}
