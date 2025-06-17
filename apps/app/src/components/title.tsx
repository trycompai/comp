import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
export function Title({ title, href }: { title: string; href: string }) {
  return (
    <div className="mt-4 flex items-center gap-2">
      <Link href={href} className="flex items-center gap-2">
        <ArrowLeftIcon className="h-4 w-4" />
      </Link>

      <h1 className="text-md font-medium">{title}</h1>
    </div>
  );
}
