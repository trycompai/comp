import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Transforms ISO control JSON into SOA configuration format
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
  text: string;
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

export function transformISOConfigToSOA(
  controls: ISOControl[],
): SOAConfiguration {
  const columns: SOAColumn[] = [
    { name: 'closure', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'control_objective', type: 'string' },
    { name: 'isApplicable', type: 'boolean' },
    { name: 'justification', type: 'string' },
  ];

  const questions: SOAQuestion[] = controls
    .filter((control) => {
      return (
        control.title &&
        control.control_objective !== null &&
        control.control_objective.trim() !== ''
      );
    })
    .map((control, index) => {
      const id = `iso-control-${index}-${control.title.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`;

      return {
        id,
        text: control.control_objective || control.title,
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
 */
export async function loadISOConfig(): Promise<SOAConfiguration> {
  // Use fs.readFileSync instead of import to avoid ESM import attribute issues
  // Read from source directory since JSON files aren't copied to dist during compilation
  // __dirname in compiled code is dist/src/soa/utils
  // We need to reference the source file relative to the project root (apps/api)
  // From dist/src/soa/utils, go up to dist/src, then replace 'dist' with 'src'
  const sourceDir = __dirname.replace(/dist[\\/]src/, 'src');
  const configPath = join(sourceDir, '../seedJson/ISO/config.json');

  try {
    const configContent = readFileSync(configPath, 'utf-8');
    const isoControls: ISOControl[] = JSON.parse(configContent);
    return transformISOConfigToSOA(isoControls);
  } catch (error) {
    // Fallback: try using process.cwd() (should be apps/api when running)
    const fallbackPath = join(
      process.cwd(),
      'src/soa/seedJson/ISO/config.json',
    );
    try {
      const configContent = readFileSync(fallbackPath, 'utf-8');
      const isoControls: ISOControl[] = JSON.parse(configContent);
      return transformISOConfigToSOA(isoControls);
    } catch {
      throw new Error(
        `Failed to load ISO config: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
          `Tried paths: ${configPath}, ${fallbackPath}. ` +
          `__dirname: ${__dirname}, process.cwd(): ${process.cwd()}`,
      );
    }
  }
}
