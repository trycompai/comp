import { showHelp } from './help';
import { initCommand } from './commands/init';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { envCommand } from './commands/env';
import { statsCommand } from './commands/stats';
import { orgsCommand } from './commands/orgs';
import { usersCommand } from './commands/users';
import { auditLogsCommand } from './commands/audit-logs';
import { die } from './utils';

const args = process.argv.slice(2);
const command = args[0];
const commandArgs = args.slice(1);

async function main(): Promise<void> {
  switch (command) {
    case 'init':
      await initCommand(commandArgs);
      break;
    case 'login':
      await loginCommand(commandArgs);
      break;
    case 'logout':
      logoutCommand();
      break;
    case 'env':
      envCommand(commandArgs);
      break;
    case 'stats':
      await statsCommand();
      break;
    case 'orgs':
      await orgsCommand(commandArgs);
      break;
    case 'users':
      await usersCommand(commandArgs);
      break;
    case 'audit-logs':
      await auditLogsCommand(commandArgs);
      break;
    case 'help':
      showHelp(commandArgs[0]);
      break;
    case undefined:
      showHelp();
      break;
    default:
      die(`Unknown command: ${command}. Run "comp help" for usage.`);
  }
}

main().catch((err: Error) => {
  die(err.message);
});
