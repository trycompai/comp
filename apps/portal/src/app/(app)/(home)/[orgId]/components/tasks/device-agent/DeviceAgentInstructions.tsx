'use client';

import type { SupportedOS } from '@/utils/os';
import { Button } from '@trycompai/ui-shadcn';
import { Download, Loader2 } from 'lucide-react';

interface DeviceAgentInstructionsProps {
  isMacOS: boolean;
  detectedOS: SupportedOS | null;
  onChangeDetectedOS: (value: SupportedOS) => void;
  onDownload: () => void;
  isDownloading: boolean;
  downloadDisabled: boolean;
}

const ARCHITECTURE_OPTIONS = [
  { label: 'Apple Silicon', value: 'macos' },
  { label: 'Intel', value: 'macos-intel' },
] as const;

export function DeviceAgentInstructions({
  isMacOS,
  detectedOS,
  onChangeDetectedOS,
  onDownload,
  isDownloading,
  downloadDisabled,
}: DeviceAgentInstructionsProps) {
  return (
    <div className="flex flex-col gap-3">
      <ol className="list-decimal space-y-4 pl-5 text-sm">
        <li>
          <p className="font-semibold">Download the Device Agent installer.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Click the download button below to get the Device Agent installer.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {isMacOS ? (
              <select
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-[3px] sm:w-[180px]"
                value={detectedOS ?? 'macos'}
                onChange={(e) => onChangeDetectedOS(e.target.value as SupportedOS)}
              >
                {ARCHITECTURE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : null}

            <Button
              size="sm"
              onClick={onDownload}
              disabled={downloadDisabled}
              className="w-full sm:w-auto"
            >
              <span className="inline-flex items-center gap-2">
                {isDownloading ? <Loader2 size={16} /> : <Download size={16} />}
                {isDownloading ? 'Downloading…' : 'Download Agent'}
              </span>
            </Button>
          </div>
        </li>

        <li>
          <p className="font-semibold">Install the Comp AI Device Agent.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isMacOS
              ? 'Double-click the downloaded DMG file and follow the installation instructions.'
              : 'Double-click the downloaded EXE file and follow the installation instructions.'}
          </p>
        </li>

        {isMacOS ? (
          <li>
            <p className="font-semibold">Login with your work email.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              After installation, login with your work email, select your organization and then
              click &quot;Link Device&quot; and &quot;Install Agent&quot;.
            </p>
          </li>
        ) : (
          <li>
            <p className="font-semibold">Enable MDM.</p>
            <div className="mt-1 flex flex-col gap-1.5">
              <p className="text-sm text-muted-foreground">
                Find the Fleet Desktop app in your system tray (bottom right corner). Click on it
                and click My Device.
              </p>
              <p className="text-sm text-muted-foreground">
                You should see a banner that asks you to enable MDM. Click the button and follow the
                instructions.
              </p>
              <p className="text-sm text-muted-foreground">
                After you&apos;ve enabled MDM, refresh this page and the banner will disappear.
              </p>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}
