import { auth } from '@/utils/auth';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@comp/ui/breadcrumb';
import { db } from '@db';
import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import { AutomationLayoutWrapper } from './automation-layout-wrapper';
import { Chat } from './chat';
import { AutomationTester } from './components/automation/AutomationTester';
import { Horizontal } from './components/layout/panels';
import { getHorizontal } from './components/layout/sizing';
import { TabContent, TabItem } from './components/tabs';
import { WorkflowVisualizerSimple as WorkflowVisualizer } from './components/workflow/workflow-visualizer-simple';
import { ScriptInitializer } from './script-initializer';

export default async function Page({
  params,
}: {
  params: Promise<{ taskId: string; orgId: string }>;
}) {
  const { taskId, orgId } = await params;
  const store = await cookies();
  const horizontalSizes = getHorizontal(store);

  // Fetch task details for breadcrumb
  const session = await auth.api.getSession({ headers: await headers() });
  const task = await db.task.findUnique({
    where: {
      id: taskId,
      organizationId: session?.session.activeOrganizationId,
    },
  });

  return (
    <AutomationLayoutWrapper>
      <div
        className="flex flex-col overflow-hidden bg-background"
        style={{ height: 'calc(100vh - 8rem)' }}
      >
        <ScriptInitializer orgId={orgId} taskId={taskId} />

        {/* Breadcrumb Navigation */}
        <div className="pb-3 px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/${orgId}/tasks`}>Tasks</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/${orgId}/tasks/${taskId}`}>{task?.title || 'Task'}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>AI Automation</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <ul className="flex space-x-5 font-mono text-sm tracking-tight py-2 md:hidden shrink-0">
          <TabItem tabId="chat">Chat</TabItem>
          <TabItem tabId="lambda">Test Scripts</TabItem>
          <TabItem tabId="workflow">Workflow</TabItem>
        </ul>

        {/* Mobile layout tabs taking the whole space*/}
        <div className="flex flex-1 w-full min-h-0 overflow-hidden md:hidden">
          <TabContent tabId="chat" className="flex-1 min-h-0">
            <Chat className="h-full" orgId={orgId} taskId={taskId} />
          </TabContent>
          <TabContent tabId="lambda" className="flex-1">
            <AutomationTester className="flex-1 overflow-hidden" orgId={orgId} taskId={taskId} />
          </TabContent>
          <TabContent tabId="workflow" className="flex-1">
            <WorkflowVisualizer className="flex-1 overflow-hidden" />
          </TabContent>
        </div>

        {/* Desktop layout: Chat on left, Workflow on right */}
        <div className="hidden flex-1 w-full min-h-0 overflow-hidden md:flex px-4 pb-1">
          <Horizontal
            defaultLayout={horizontalSizes ?? [50, 50]}
            left={<Chat className="h-full" orgId={orgId} taskId={taskId} />}
            right={<WorkflowVisualizer className="h-full" />}
          />
        </div>
      </div>
    </AutomationLayoutWrapper>
  );
}
