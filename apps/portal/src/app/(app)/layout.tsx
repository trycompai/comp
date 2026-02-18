import { Header } from '@/app/components/header';
import { auth } from '@/app/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/auth');
  }

  return (
    <div className="flex min-h-dvh">
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="w-full min-w-0 flex-1 px-3 pt-4 sm:px-4 sm:pt-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
