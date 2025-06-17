import type { Metadata } from 'next';
import { EmployeesOverview } from './components/EmployeesOverview';

export default async function PeopleOverviewPage() {
  return <EmployeesOverview />;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'People',
  };
}
