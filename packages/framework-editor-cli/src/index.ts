import { Command } from 'commander';
import { registerAuthCommands } from './commands/auth.js';
import { registerFrameworkCommands } from './commands/framework.js';
import { registerRequirementCommands } from './commands/requirement.js';
import { registerControlCommands } from './commands/control.js';
import { registerPolicyCommands } from './commands/policy.js';
import { registerTaskCommands } from './commands/task.js';

const program = new Command();

program
  .name('comp-framework')
  .version('1.0.0', '-V')
  .description(
    `Comp AI Framework Editor CLI

Manage compliance framework templates via the Comp AI API. This tool lets you
create and configure frameworks, requirements, controls, policies, and tasks
from the command line.

ENTITY HIERARCHY:
  Framework  →  contains Requirements
  Requirement  ↔  linked to Control Templates (many-to-many)
  Control Template  ↔  linked to Policy Templates (many-to-many)
  Control Template  ↔  linked to Task Templates (many-to-many)

GETTING STARTED:
  1. Authenticate:    comp-framework auth login
  2. List frameworks: comp-framework framework list
  3. Create one:      comp-framework framework create --name "SOC 2" --version "2024" --description "..."

AUTHENTICATION:
  The CLI authenticates via browser-based login (same flow as the device agent).
  Credentials are stored in an encrypted local config file.
  Set COMP_SESSION_TOKEN env var to skip interactive login (for CI/automation).
  Set COMP_API_URL env var to change the default API URL.

OUTPUT:
  All output is JSON by default for easy parsing by scripts and AI agents.
  Success: { "success": true, "data": ... }
  Error:   { "success": false, "error": "..." }
  Use --no-json for human-readable tables (e.g. comp-framework --no-json framework list).`,
  )
  .option('--no-json', 'Output as human-readable tables instead of JSON')
  .option(
    '--api-url <url>',
    'API base URL (default: COMP_API_URL env var or http://localhost:3333)',
  );

registerAuthCommands(program);
registerFrameworkCommands(program);
registerRequirementCommands(program);
registerControlCommands(program);
registerPolicyCommands(program);
registerTaskCommands(program);

program.parse();
