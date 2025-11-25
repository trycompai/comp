import { UnsubscribePreferencesClient } from './client';

interface PageProps {
  searchParams: Promise<{ email?: string; token?: string }>;
}

export default async function UnsubscribePreferencesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { email, token } = params;

  if (!email || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <div className="text-center text-red-600">Email and token are required</div>
        </div>
      </div>
    );
  }

  return <UnsubscribePreferencesClient email={email} token={token} />;
}

