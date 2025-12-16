import { cn } from '@comp/ui/cn';

interface AnimatedLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  isCollapsed: boolean;
  blurred?: boolean;
}

export function AnimatedLayout({ children, sidebar, isCollapsed, blurred }: AnimatedLayoutProps) {
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <div
        className={cn(
          'bg-background hidden h-full shrink-0 overflow-y-auto border-r duration-300 ease-in-out md:block',
          isCollapsed ? 'w-[80px]' : 'w-[240px]',
          blurred ? 'pointer-events-none blur-xs select-none' : '',
        )}
      >
        {sidebar}
      </div>
      <div className="bg-background flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
