import { AutomationLayoutWrapper } from './automation-layout-wrapper';
import { AutomationPageClient } from './components/AutomationPageClient';

export default async function Page({
  params,
}: {
  params: Promise<{ taskId: string; orgId: string }>;
}) {
  const { taskId, orgId } = await params;

  return (
    <AutomationLayoutWrapper>
      <div className="h-screen overflow-hidden">
        <AutomationPageClient orgId={orgId} taskId={taskId} />
      </div>
    </AutomationLayoutWrapper>
  );
}
