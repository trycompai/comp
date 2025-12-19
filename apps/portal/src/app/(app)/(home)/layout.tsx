import { auth } from '@/app/lib/auth';
import { Container } from '@trycompai/ui-v2';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return redirect('/auth');
  }

  return <Container maxW="3xl">{children}</Container>;
}
