'use client';

import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useTaskAutomationExecution, useTaskAutomationScriptsList } from '../../hooks';

interface Props {
  className?: string;
  orgId: string;
  taskId: string;
}

export function AutomationTester({ className, orgId, taskId }: Props) {
  const { scripts, isLoading, refresh } = useTaskAutomationScriptsList({ orgId });
  const [selectedKey, setSelectedKey] = useState<string | undefined>();

  const { execute, isExecuting, result, error } = useTaskAutomationExecution({
    orgId,
    taskId,
    onSuccess: () => {
      // Refresh the scripts list after successful execution
      refresh();
    },
  });

  const handleTest = async () => {
    await execute();
  };

  const displayResult = useMemo(() => {
    if (error) {
      return JSON.stringify({ error: error.message }, null, 2);
    }
    if (result) {
      return JSON.stringify(result, null, 2);
    }
    return 'No results yet';
  }, [result, error]);

  return (
    <div className={className}>
      <div className="flex h-full flex-col">
        <div className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Automation Script Tester</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="script-select">Select Script</Label>
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger id="script-select" className="w-full">
                  <SelectValue placeholder={isLoading ? 'Loading...' : 'Select a script'} />
                </SelectTrigger>
                <SelectContent>
                  {scripts.map((script) => (
                    <SelectItem key={script.key} value={script.key}>
                      {script.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleTest}
              disabled={!selectedKey || isExecuting}
              className="w-full"
              variant="secondary"
            >
              {isExecuting ? 'Running...' : 'Run Script'}
            </Button>
          </div>
        </div>
        <div className="flex-1 border-t">
          <ScrollArea className="h-full">
            <pre className="p-4 text-sm">{displayResult}</pre>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
