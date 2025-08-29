'use client';

import { runStagehand, startBBSSession } from '@/lib/browserbase/main';
import { useCallback, useState } from 'react';

export function StagehandEmbed() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);

  const startSession = useCallback(async () => {
    const { sessionId, debugUrl } = await startBBSSession();
    setSessionId(sessionId);
    setDebugUrl(debugUrl);
    await runStagehand(sessionId);
  }, []);

  return (
    <div>
      {!sessionId && <button onClick={startSession}>Start Session</button>}
      {sessionId && debugUrl && <iframe src={debugUrl} className="w-full h-full" />}
    </div>
  );
}
