import type { BrowserbaseSessionService } from './browserbase-session.service';

type Stagehand = import('@browserbasehq/stagehand').Stagehand;

/**
 * Emit the live-view URL of the tab the AI is currently on, so the connect flow's
 * iframe follows it across new tabs. Best-effort — a failure just leaves the live
 * view on its current tab.
 */
export async function streamActiveLiveView({
  stagehand,
  sessions,
  sessionId,
  onLiveView,
}: {
  stagehand: Stagehand;
  sessions: BrowserbaseSessionService;
  sessionId: string;
  onLiveView?: (url: string) => void;
}): Promise<void> {
  if (!onLiveView) return;
  try {
    const pages = stagehand.context?.pages?.() ?? [];
    const activeUrl = pages[pages.length - 1]?.url();
    const url = await sessions.getActivePageLiveViewUrl(sessionId, activeUrl);
    if (url) onLiveView(url);
  } catch {
    // Best-effort — keep the current live view.
  }
}
