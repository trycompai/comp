'use client';

import { useEffect } from 'react';
import { useTaskAutomationStore } from './lib/task-automation-store';
import { useTaskAutomationScript } from './hooks';

interface Props {
  orgId: string;
  taskId: string;
}

export function ScriptInitializer({ orgId, taskId }: Props) {
  const { setScriptGenerated } = useTaskAutomationStore();
  const { script, scriptExists } = useTaskAutomationScript({ orgId, taskId });

  useEffect(() => {
    if (scriptExists && script) {
      // Script exists, mark it as generated
      setScriptGenerated(true, script.key);
      console.log('[ScriptInitializer] Found existing script:', script.key);
    }
  }, [scriptExists, script, setScriptGenerated]);

  return null;
}
