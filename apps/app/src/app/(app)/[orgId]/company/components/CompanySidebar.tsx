'use client';

import { AppShellNav, AppShellNavItem } from '@trycompai/design-system';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { evidenceFormDefinitionList } from '../forms';

interface CompanySidebarProps {
  orgId: string;
}

export function CompanySidebar({ orgId }: CompanySidebarProps) {
  const pathname = usePathname() ?? '';

  const isPathActive = (path: string) => {
    if (path === `/${orgId}/company`) {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  // Group forms by category preserving insertion order
  const categories = new Map<string, Array<{ id: string; label: string; path: string }>>();
  for (const form of evidenceFormDefinitionList) {
    const cat = form.category;
    if (!categories.has(cat)) {
      categories.set(cat, []);
    }
    categories.get(cat)!.push({
      id: form.type,
      label: form.title,
      path: `/${orgId}/company/${form.type}`,
    });
  }

  return (
    <AppShellNav>
      <Link href={`/${orgId}/company`}>
        <AppShellNavItem isActive={isPathActive(`/${orgId}/company`)}>Overview</AppShellNavItem>
      </Link>

      {Array.from(categories.entries()).map(([category, items]) => (
        <div key={category} className="mt-4">
          <div className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {category}
          </div>
          {items.map((item) => (
            <Link key={item.id} href={item.path}>
              <AppShellNavItem isActive={isPathActive(item.path)}>{item.label}</AppShellNavItem>
            </Link>
          ))}
        </div>
      ))}
    </AppShellNav>
  );
}
