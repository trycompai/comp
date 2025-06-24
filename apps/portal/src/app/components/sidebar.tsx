import { Icons } from '@comp/ui/icons';
import Link from 'next/link';
import { MainMenu } from './main-menu';

export async function Sidebar() {
  return (
    <aside className="bg-background sticky top-0 hidden h-dvh w-16 shrink-0 flex-col items-center justify-between border-r py-4 md:flex">
      <div className="flex flex-col items-center justify-center gap-4">
        <Link href="/">
          <Icons.Logo />
        </Link>
        <MainMenu />
      </div>
    </aside>
  );
}
