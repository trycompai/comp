import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect('/');
  }

  // Check if user is platform admin
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isPlatformAdmin: true },
  });

  if (!user?.isPlatformAdmin) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold">Platform Admin</h1>
              <nav className="flex items-center gap-4 text-sm">
                <a
                  href="/admin/integrations"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Integrations
                </a>
              </nav>
            </div>
            <a
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
      <main className="container mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
