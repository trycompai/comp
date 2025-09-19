'use client';

import { useState } from 'react';
import useSWR from 'swr';
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function LambdaTester({ className, orgId }: { className?: string; orgId: string }) {
  const { data, isLoading } = useSWR(
    `/api/tasks-automations/lambda/functions?orgId=${encodeURIComponent(orgId)}`,
    fetcher,
    { refreshInterval: 15000 },
  );
  const [selectedKey, setSelectedKey] = useState<string | undefined>();
  const [invoking, setInvoking] = useState(false);
  const [result, setResult] = useState<string>('');

  const items: { key: string }[] = data?.items ?? [];

  async function onTest() {
    setInvoking(true);
    setResult('');
    try {
      const resp = await fetch('/api/tasks-automations/lambda/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: orgId,
          taskId: selectedKey?.split('/').pop()?.replace(/\.js$/, ''),
        }),
      });
      const json = await resp.json();
      setResult(JSON.stringify(json, null, 2));
    } finally {
      setInvoking(false);
    }
  }

  return (
    <div className={className}>
      <div className="p-3 space-y-3 rounded-xs border">
        <div className="space-y-2">
          <Label className="text-sm">Select function</Label>
          <Select
            value={selectedKey}
            onValueChange={setSelectedKey}
            disabled={isLoading || !items.length}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? 'Loading…' : 'Choose function'} />
            </SelectTrigger>
            <SelectContent>
              {items.map((i) => (
                <SelectItem key={i.key} value={i.key}>
                  {i.key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={onTest} disabled={!selectedKey || invoking}>
            {invoking ? 'Testing…' : 'Test'}
          </Button>
        </div>
      </div>

      <div className="mt-3 p-3 rounded-xs border h-64">
        <Label className="text-sm">Result</Label>
        <ScrollArea className="h-[13rem] mt-2">
          <pre className="text-xs whitespace-pre-wrap break-all">{result}</pre>
        </ScrollArea>
      </div>
    </div>
  );
}
