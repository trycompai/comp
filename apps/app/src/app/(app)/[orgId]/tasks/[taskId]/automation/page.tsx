import { Chat } from './chat';
// Removed sandbox-dependent FileExplorer and Preview in favor of Lambda tester
import { cookies } from 'next/headers';
import { hideBanner } from './actions';
import { LambdaTester } from './components/lambda/LambdaTester';
import { Horizontal } from './components/layout/panels';
import { getHorizontal, getVertical } from './components/layout/sizing';
import { Welcome } from './components/modals/welcome';
import { TabContent, TabItem } from './components/tabs';
import { WorkflowVisualizerNew as WorkflowVisualizer } from './components/workflow/workflow-visualizer-new';
import { FileExplorer } from './file-explorer';
import { Initializer } from './initializer';

export default async function Page({
  params,
}: {
  params: Promise<{ taskId: string; orgId: string }>;
}) {
  const { taskId, orgId } = await params;
  const store = await cookies();
  const banner = store.get('banner-hidden')?.value !== 'true';
  const horizontalSizes = getHorizontal(store);
  const verticalSizes = getVertical(store);

  return (
    <>
      <Welcome defaultOpen={banner} onDismissAction={hideBanner} />
      <div className="flex flex-col h-screen max-h-screen overflow-hidden p-2 space-x-2">
        <Initializer orgId={orgId} taskId={taskId} />
        <ul className="flex space-x-5 font-mono text-sm tracking-tight px-1 py-2 md:hidden">
          <TabItem tabId="chat">Chat</TabItem>
          <TabItem tabId="lambda">Lambda Tester</TabItem>
          <TabItem tabId="preview">Preview</TabItem>
          <TabItem tabId="file-explorer">File Explorer</TabItem>
          <TabItem tabId="workflow">Workflow</TabItem>
        </ul>

        {/* Mobile layout tabs taking the whole space*/}
        <div className="flex flex-1 w-full overflow-hidden pt-2 md:hidden">
          <TabContent tabId="chat" className="flex-1">
            <Chat className="flex-1 overflow-hidden" />
          </TabContent>
          <TabContent tabId="lambda" className="flex-1">
            <LambdaTester className="flex-1 overflow-hidden" orgId={orgId} />
          </TabContent>
          <TabContent tabId="file-explorer" className="flex-1">
            <FileExplorer
              className="flex-1 overflow-hidden"
              initialSelectedPath={`/lambdas/${taskId}.js`}
              orgId={orgId}
              taskId={taskId}
            />
          </TabContent>
          <TabContent tabId="workflow" className="flex-1">
            <WorkflowVisualizer className="flex-1 overflow-hidden" />
          </TabContent>
        </div>

        {/* Desktop layout: Chat on left, Workflow on right */}
        <div className="hidden flex-1 w-full min-h-0 overflow-hidden pt-2 md:flex">
          <Horizontal
            defaultLayout={horizontalSizes ?? [50, 50]}
            left={<Chat className="flex-1 overflow-hidden" />}
            right={<WorkflowVisualizer className="flex-1 overflow-hidden" />}
          />
        </div>
      </div>
    </>
  );
}
