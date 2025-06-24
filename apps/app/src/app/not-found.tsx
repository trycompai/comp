import Link from 'next/link';

export default async function NotFound() {
  return (
    <div className="text-muted-foreground flex h-dvh flex-col items-center justify-center text-center text-sm">
      <h2 className="mb-2 text-xl font-semibold">{'404 - Page not found'}</h2>
      <p className="mb-4">{'The page you are looking for does not exist.'}</p>
      <Link href="/" className="underline">
        {'Return to dashboard'}
      </Link>
    </div>
  );
}
