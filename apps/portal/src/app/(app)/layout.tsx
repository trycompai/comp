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
    <div className="flex min-h-dvh">
      <div className="flex flex-1 flex-col">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <Header />
        </div>
        <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
