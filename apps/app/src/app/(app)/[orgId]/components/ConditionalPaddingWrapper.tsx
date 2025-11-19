'use client';

import { usePathname } from 'next/navigation';

export function ConditionalPaddingWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't add padding for automation pages, automation overview pages, and task detail pages
  const isAutomationPage = pathname?.includes('/automation/');
  const isAutomationOverviewPage = pathname?.includes('/automations/');
  const isTaskDetailPage = pathname?.match(/\/tasks\/[^/]+$/) !== null; // Matches /tasks/[taskId] but not /tasks/[taskId]/automation

  if (isAutomationPage || isAutomationOverviewPage || isTaskDetailPage) {
    return <>{children}</>;
  }

  return <div className="px-4 sm:px-6 lg:px-8">{children}</div>;
}
