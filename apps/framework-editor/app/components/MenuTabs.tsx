'use client';

import { Tabs, TabsList, TabsTrigger } from '@comp/ui/tabs';
import Link from 'next/link';
import { useSelectedLayoutSegments } from 'next/navigation';

function MenuTabs() {
  const segments = useSelectedLayoutSegments();

  const navItems = [
    { name: 'Frameworks', href: '/frameworks', segment: 'frameworks' },
    { name: 'Controls', href: '/controls', segment: 'controls' },
    { name: 'Policies', href: '/policies', segment: 'policies' },
    { name: 'Tasks', href: '/tasks', segment: 'tasks' },
  ];

  const currentSegment = segments[1];

  return (
    <Tabs defaultValue={currentSegment} className="w-full" value={currentSegment}>
      <TabsList className="flex w-full">
        {navItems.map((item) => (
          <TabsTrigger key={item.name} value={item.segment} className="flex-1" asChild>
            <Link href={item.href}>{item.name}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

// Ensure named export
export { MenuTabs };
