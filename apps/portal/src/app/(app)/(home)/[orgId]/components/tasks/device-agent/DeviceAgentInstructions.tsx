'use client';

import type { SupportedOS } from '@/utils/os';
import {
  Button,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/design-system';
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

type ArchitectureOptionValue = (typeof ARCHITECTURE_OPTIONS)[number]['value'];

export function DeviceAgentInstructions({
  isMacOS,
  detectedOS,
  onChangeDetectedOS,
  onDownload,
  isDownloading,
  downloadDisabled,
}: DeviceAgentInstructionsProps) {
  const architectureValue: ArchitectureOptionValue =
    detectedOS === 'macos-intel' ? 'macos-intel' : 'macos';

  const selectedArchitectureLabel =
    ARCHITECTURE_OPTIONS.find((opt) => opt.value === architectureValue)?.label ??
    ARCHITECTURE_OPTIONS[0].label;

  const handleArchitectureChange = (value: ArchitectureOptionValue | null) => {
    if (!value) return;
    onChangeDetectedOS(value);
  };

  return (
    <div className="flex flex-col gap-4">
      <ol className="grid list-decimal gap-4 pl-5 text-sm">
        <li className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <p className="font-semibold">Download the Device Agent installer.</p>
            <p className="text-muted-foreground">
              Click the download button below to get the Device Agent installer.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isMacOS ? (
              <Select value={architectureValue} onValueChange={handleArchitectureChange}>
                <SelectTrigger size="sm" className="w-full sm:w-44">
                  <SelectValue>{selectedArchitectureLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {ARCHITECTURE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : null}

            <Button
              size="sm"
              onClick={onDownload}
              disabled={downloadDisabled}
              className="w-full sm:w-auto"
            >
              {isDownloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {isDownloading ? 'Downloading…' : 'Download Agent'}
            </Button>
          </div>
        </li>

        <li className="flex flex-col gap-1">
          <p className="font-semibold">Install the Comp AI Device Agent.</p>
          <p className="text-muted-foreground">
            {isMacOS
              ? 'Double-click the downloaded DMG file and follow the installation instructions.'
              : 'Double-click the downloaded EXE file and follow the installation instructions.'}
          </p>
        </li>

        {isMacOS ? (
          <li className="flex flex-col gap-1">
            <p className="font-semibold">Login with your work email.</p>
            <p className="text-muted-foreground">
              After installation, login with your work email, select your organization and then
              click &quot;Link Device&quot; and &quot;Install Agent&quot;.
            </p>
          </li>
        ) : (
          <li className="flex flex-col gap-2">
            <p className="font-semibold">Enable MDM.</p>
            <div className="flex flex-col gap-1.5 text-muted-foreground">
              <p>
                Find the Fleet Desktop app in your system tray (bottom right corner). Click on it
                and click My Device.
              </p>
              <p>
                You should see a banner that asks you to enable MDM. Click the button and follow the
                instructions.
              </p>
              <p>After you&apos;ve enabled MDM, refresh this page and the banner will disappear.</p>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}
