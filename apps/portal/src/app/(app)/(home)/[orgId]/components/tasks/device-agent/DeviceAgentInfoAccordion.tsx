'use client';

import { ChevronDown } from 'lucide-react';

export function DeviceAgentInfoAccordion() {
  return (
    <div className="flex flex-col gap-2">
      <details className="group rounded-md border border-border p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between">
          <span className="text-sm font-medium">System Requirements</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Operating Systems:</span> macOS 14+,
            Windows 10+
          </p>
          <p>
            <span className="font-semibold text-foreground">Memory:</span> 512MB RAM minimum
          </p>
          <p>
            <span className="font-semibold text-foreground">Storage:</span> 200MB available disk
            space
          </p>
        </div>
      </details>

      <details className="group rounded-md border border-border p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between">
          <span className="text-sm font-medium">About Comp AI Device Monitor</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            Comp AI Device Monitor is a lightweight agent that helps ensure your device meets
            security compliance requirements.
          </p>
          <p>
            It monitors device configuration, installed software, and security settings to help
            maintain a secure work environment.
          </p>
          <p>
            <span className="font-semibold text-foreground">Security powered by Comp AI:</span> Your
            organization uses Comp AI to maintain security and compliance standards.
          </p>
          <p className="text-xs">If you have questions, contact your IT administrator.</p>
        </div>
      </details>
    </div>
  );
}
