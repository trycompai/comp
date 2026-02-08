import { Header } from '@/app/components/header';
import { auth } from '@/app/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  console.log('session', session);

  if (!session?.user) {
    console.log('no session');
    redirect('/auth');
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="border-b px-4 sm:px-6 lg:px-8">
        <Header />
      </div>
      <main className="flex-1 px-4 sm:px-0">{children}</main>
    </div>
  );
}
