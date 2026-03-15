const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

const ROOT_HELP = `
${BOLD}comp${RESET} — Admin CLI for the Comp platform

${YELLOW}Usage:${RESET}
  comp <command> [options]

${YELLOW}Commands:${RESET}
  ${CYAN}init${RESET}              Configure environment ${DIM}[--local|--staging|--production]${RESET}
  ${CYAN}login${RESET}             Authenticate via OAuth ${DIM}[--local|--staging|--production]${RESET}
  ${CYAN}logout${RESET}            Clear session
  ${CYAN}env${RESET}               Show or switch active environment ${DIM}[name]${RESET}
  ${CYAN}stats${RESET}             Platform overview
  ${CYAN}orgs${RESET}              List organizations ${DIM}[id] [--limit N] [--offset N]${RESET}
  ${CYAN}orgs search${RESET}       Search orgs by name, slug, id, or member email ${DIM}--query <q>${RESET}
  ${CYAN}org${RESET}               Drill into an org ${DIM}<orgId> <subcommand> [options]${RESET}
  ${CYAN}users${RESET}             List users ${DIM}[id] [--limit N] [--offset N]${RESET}
  ${CYAN}users search${RESET}      Search users by email ${DIM}--email <query>${RESET}
  ${CYAN}users platform-admin${RESET}  Toggle platform admin ${DIM}<id>${RESET}
  ${CYAN}audit-logs${RESET}        Query audit logs ${DIM}[--org-id X] [--entity-type Y]${RESET}
  ${CYAN}help${RESET}              Show this help

${YELLOW}Examples:${RESET}
  comp init --local
  comp login
  comp stats
  comp orgs --limit 10
  comp org org_abc123 health
  comp org org_abc123 tasks --status todo --limit 5
  comp users search --email john@
  comp users platform-admin usr_abc123
`;

const COMMAND_HELP: Record<string, string> = {
  init: `
${BOLD}comp init${RESET} — Configure an environment

${YELLOW}Usage:${RESET}
  comp init [--local|--staging|--production]

${YELLOW}Options:${RESET}
  ${CYAN}--local${RESET}        Pre-fill with local defaults (http://localhost:3333)
  ${CYAN}--staging${RESET}      Pre-fill with staging defaults
  ${CYAN}--production${RESET}   Pre-fill with production defaults

Prompts for API URL, saves to ~/.comprc. Run ${CYAN}comp login${RESET} after to authenticate.
`,
  login: `
${BOLD}comp login${RESET} — Authenticate via OAuth

${YELLOW}Usage:${RESET}
  comp login [--local|--staging|--production]

Opens your browser for Google OAuth. On success, stores a session token
that expires in 1 hour. Your account must have ${BOLD}isPlatformAdmin${RESET} enabled.
`,
  logout: `
${BOLD}comp logout${RESET} — Clear session

Removes the stored session token for the active environment.
`,
  env: `
${BOLD}comp env${RESET} — Show or switch active environment

${YELLOW}Usage:${RESET}
  comp env            Show current environment
  comp env <name>     Switch to named environment
`,
  stats: `
${BOLD}comp stats${RESET} — Platform overview

Shows counts of organizations, users, members, controls, policies,
risks, vendors, tasks, frameworks, and findings.
`,
  orgs: `
${BOLD}comp orgs${RESET} — List, get, or search organizations

${YELLOW}Usage:${RESET}
  comp orgs                              List organizations
  comp orgs <id>                         Get organization details
  comp orgs search --query <q>           Search by name, slug, id, or member email
  comp orgs --limit 10                   Limit results

${YELLOW}Examples:${RESET}
  comp orgs search --query acme
  comp orgs search --query john@example.com
`,
  org: `
${BOLD}comp org${RESET} — Drill into an organization

${YELLOW}Usage:${RESET}
  comp org <orgId> <subcommand> [options]

${YELLOW}Subcommands:${RESET}
  ${CYAN}health${RESET}          Diagnostic summary (overdue tasks, stale integrations, etc.)
  ${CYAN}members${RESET}         List members with roles ${DIM}[--limit N]${RESET}
  ${CYAN}policies${RESET}        List policies ${DIM}[--limit N] [--status draft|published|...]${RESET}
  ${CYAN}tasks${RESET}           List tasks ${DIM}[--limit N] [--status todo|in_progress|done|...]${RESET}
  ${CYAN}controls${RESET}        List controls ${DIM}[--limit N]${RESET}
  ${CYAN}risks${RESET}           List risks ${DIM}[--limit N] [--status open|closed|...]${RESET}
  ${CYAN}vendors${RESET}         List vendors ${DIM}[--limit N]${RESET}
  ${CYAN}frameworks${RESET}      List frameworks
  ${CYAN}findings${RESET}        List findings ${DIM}[--limit N] [--status open|closed|...]${RESET}
  ${CYAN}integrations${RESET}    List integrations
  ${CYAN}comments${RESET}        Recent comments ${DIM}[--limit N]${RESET}
  ${CYAN}audit-logs${RESET}      Org audit logs ${DIM}[--limit N]${RESET}

${YELLOW}Examples:${RESET}
  comp org org_abc123 health
  comp org org_abc123 tasks --status todo --limit 5
  comp org org_abc123 members
`,
  users: `
${BOLD}comp users${RESET} — List, search, or get users

${YELLOW}Usage:${RESET}
  comp users                          List users
  comp users <id>                     Get user details
  comp users search --email <query>   Search by email
  comp users platform-admin <id>      Toggle platform admin
`,
  'audit-logs': `
${BOLD}comp audit-logs${RESET} — Query audit logs

${YELLOW}Usage:${RESET}
  comp audit-logs                          List recent logs
  comp audit-logs --org-id <id>            Filter by organization
  comp audit-logs --entity-type <type>     Filter by entity type
  comp audit-logs --limit 100              Limit results
`,
};

export function showHelp(command?: string): void {
  if (command && COMMAND_HELP[command]) {
    console.log(COMMAND_HELP[command]);
  } else {
    console.log(ROOT_HELP);
  }
}
