import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

interface AuthMeResponse {
  user: { isPlatformAdmin: boolean } | null;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect('/');
  }

  const meRes = await serverApi.get<AuthMeResponse>('/v1/auth/me');

  if (!meRes.data?.user?.isPlatformAdmin) {
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
