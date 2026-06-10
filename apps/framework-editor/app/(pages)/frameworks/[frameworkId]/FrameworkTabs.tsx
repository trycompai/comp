'use client';

import { confirmDiscardUnsavedChanges } from '@/app/lib/unsaved-changes';
import { Tabs, TabsList, TabsTrigger } from '@trycompai/ui';
import Link from 'next/link';
import { useParams, useSelectedLayoutSegment } from 'next/navigation';

export function FrameworkTabs() {
  const { frameworkId } = useParams<{ frameworkId: string }>();
  const segment = useSelectedLayoutSegment();

  const tabs = [
    { name: 'Requirements', href: `/frameworks/${frameworkId}`, segment: null },
    { name: 'Controls', href: `/frameworks/${frameworkId}/controls`, segment: 'controls' },
    { name: 'Policies', href: `/frameworks/${frameworkId}/policies`, segment: 'policies' },
    { name: 'Tasks', href: `/frameworks/${frameworkId}/tasks`, segment: 'tasks' },
    { name: 'Documents', href: `/frameworks/${frameworkId}/documents`, segment: 'documents' },
    { name: 'Versions', href: `/frameworks/${frameworkId}/versions`, segment: 'versions' },
  ];

  const activeValue = segment ?? 'requirements';

  return (
    <Tabs value={activeValue} className="w-full">
      <TabsList className="flex w-full">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.name}
            value={tab.segment ?? 'requirements'}
            className="flex-1"
            asChild
          >
            <Link
              href={tab.href}
              onClick={(event) => {
                if (!confirmDiscardUnsavedChanges()) event.preventDefault();
              }}
            >
              {tab.name}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
