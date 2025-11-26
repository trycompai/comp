/**
 * Transforms ISO control JSON into SOA configuration format
 * 
 * Input format:
 * [
 *   {
 *     "title": "Control Title",
 *     "control_objective": "Control objective text",
 *     "isApplicable": null
 *   },
 *   ...
 * ]
 * 
 * Output format:
 * {
 *   columns: [
 *     { name: "title", type: "string" },
 *     { name: "control_objective", type: "string" },
 *     { name: "isApplicable", type: "boolean" }
 *   ],
 *   questions: [
 *     {
 *       id: "control-0",
 *       text: "Control objective text", // This is the question text
 *       columnMapping: {
 *         title: "Control Title",
 *         control_objective: "Control objective text",
 *         isApplicable: null
 *       }
 *     },
 *     ...
 *   ]
 * }
 */

type ISOControl = {
  title: string;
  control_objective: string | null;
  closure: string;
  isApplicable: boolean | null;
};

type SOAColumn = {
  name: string;
  type: 'string' | 'boolean' | 'text';
};

type SOAQuestion = {
  id: string;
  text: string; // Question text (from control_objective)
  columnMapping: {
    title: string;
    closure: string;
    control_objective: string | null;
    isApplicable: boolean | null;
    justification: string | null;
  };
};

type SOAConfiguration = {
  columns: SOAColumn[];
  questions: SOAQuestion[];
};

export function transformISOConfigToSOA(controls: ISOControl[]): SOAConfiguration {
  // Define columns based on the JSON structure
  // Keys are columns, types: title (string), control_objective (string), isApplicable (boolean)
  const columns: SOAColumn[] = [
    { name: 'closure', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'control_objective', type: 'string' },
    { name: 'isApplicable', type: 'boolean' },
    { name: 'justification', type: 'string' },
  ];

  // Transform each control into a question
  // Filter out entries that don't have a control_objective (category headers)
  const questions: SOAQuestion[] = controls
    .filter((control) => {
      // Only include entries that have both title and control_objective
      return control.title && control.control_objective !== null && control.control_objective.trim() !== '';
    })
    .map((control, index) => {
      // Use a stable ID based on index and title slug
      const id = `iso-control-${index}-${control.title.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`;
      
      return {
        id,
        text: control.control_objective || control.title, // Question text is the control_objective
        columnMapping: {
          closure: control.closure,
          title: control.title,
          control_objective: control.control_objective,
          isApplicable: control.isApplicable ?? null,
          justification: null,
        },
      };
    });

  return {
    columns,
    questions,
  };
}

/**
 * Loads and transforms ISO config JSON file
 * This function reads the JSON file and transforms it into SOA configuration format
 */
export async function loadISOConfig(): Promise<SOAConfiguration> {
  // Use dynamic import for JSON (works with resolveJsonModule: true in tsconfig)
  const isoControls: ISOControl[] = await import(
    '../seedJson/ISO/config.json'
  ).then((module) => module.default as ISOControl[]);

  return transformISOConfigToSOA(isoControls);
}

/**
 * Alternative: Load ISO config synchronously (for server-side use)
 * Use this if you need synchronous loading
 */
export function loadISOConfigSync(): SOAConfiguration {
  // For synchronous loading, you'd use fs.readFileSync
  // But since we're in Next.js, dynamic import is preferred
  // This is a placeholder - implement with fs if needed
  throw new Error('Use loadISOConfig() for async loading');
}

