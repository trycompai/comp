'use client';

import { cn } from '@comp/ui/cn';
import { useGT } from 'gt-next';
import { useQueryState } from 'nuqs';

const getTabs = (t: (content: string) => string) => [
  {
    name: t('All'),
    value: 'all',
  },
  {
    name: t('Installed'),
    value: 'installed',
  },
];

export function AppsTabs() {
  const t = useGT();
  const tabs = getTabs(t);
  const [currentTab, setTab] = useQueryState('tab', {
    shallow: false,
    defaultValue: 'all',
  });

  return (
    <div className="flex border-b">
      {tabs.map((tab) => (
        <button
          onClick={() => setTab(tab.value)}
          key={tab.value}
          type="button"
          className={cn(
            'relative px-4 py-2.5 text-sm font-medium transition-colors',
            'hover:text-foreground/80',
            currentTab === tab.value ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {tab.name}
          {currentTab === tab.value && (
            <span className="bg-primary absolute right-0 bottom-0 left-0 h-0.5" />
          )}
        </button>
      ))}
    </div>
  );
}
