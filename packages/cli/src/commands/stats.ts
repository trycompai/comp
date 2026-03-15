import { adminFetch } from '../client';

interface Stats {
  organizations: number;
  users: number;
  members: number;
  controls: number;
  policies: number;
  risks: number;
  vendors: number;
  tasks: number;
  frameworks: number;
  findings: number;
}

export async function statsCommand(): Promise<void> {
  const stats = (await adminFetch('stats')) as Stats;

  console.log('\n\x1b[1mPlatform Stats\x1b[0m\n');
  console.log(`  Organizations  ${stats.organizations}`);
  console.log(`  Users          ${stats.users}`);
  console.log(`  Members        ${stats.members}`);
  console.log(`  Controls       ${stats.controls}`);
  console.log(`  Policies       ${stats.policies}`);
  console.log(`  Risks          ${stats.risks}`);
  console.log(`  Vendors        ${stats.vendors}`);
  console.log(`  Tasks          ${stats.tasks}`);
  console.log(`  Frameworks     ${stats.frameworks}`);
  console.log(`  Findings       ${stats.findings}`);
  console.log('');
}
