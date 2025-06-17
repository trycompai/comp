import type { Metadata } from 'next';
import { TeamMembers } from './components/TeamMembers';
import { Card } from '@comp/ui/card';
import PageCore from '@/components/pages/PageCore.tsx';

export default async function Members() {
  return (
    <PageCore>
      <TeamMembers />
    </PageCore>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'People',
  };
}
