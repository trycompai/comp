'use client';

import type { SupportedOS } from '@/utils/os';
import {
  BodyText,
  Button,
  createListCollection,
  HStack,
  LabelText,
  OrderedList,
  Select,
  VStack,
} from '@trycompai/ui-v2';
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

type ArchitectureValue = (typeof ARCHITECTURE_OPTIONS)[number]['value'];

const ARCHITECTURE_ITEMS = ARCHITECTURE_OPTIONS.map((o) => ({
  label: o.label,
  value: o.value,
})) satisfies Array<{ label: string; value: ArchitectureValue }>;

const ARCHITECTURE_COLLECTION = createListCollection({
  items: ARCHITECTURE_ITEMS,
});

export function DeviceAgentInstructions({
  isMacOS,
  detectedOS,
  onChangeDetectedOS,
  onDownload,
  isDownloading,
  downloadDisabled,
}: DeviceAgentInstructionsProps) {
  const handleArchitectureChange = (nextValue: string | undefined) => {
    if (!nextValue) return;
    const next = ARCHITECTURE_OPTIONS.find((o) => o.value === nextValue);
    if (!next) return;
    onChangeDetectedOS(next.value);
  };

  return (
    <VStack align="stretch" gap="3">
      <OrderedList>
        <OrderedList.Item>
          <LabelText fontWeight="semibold">Download the Device Agent installer.</LabelText>
          <BodyText tone="muted" fontSize="sm" mt="1" lineHeight="short">
            Click the download button below to get the Device Agent installer.
          </BodyText>
          <HStack gap="2" mt="2" flexWrap={{ base: 'wrap', sm: 'nowrap' }}>
            {isMacOS && (
              <Select.Root
                collection={ARCHITECTURE_COLLECTION}
                value={[detectedOS ?? 'macos']}
                onValueChange={(e) => handleArchitectureChange(e.value[0])}
                positioning={{ sameWidth: true }}
                w={{ base: 'full', sm: '180px' }}
                flex="0 0 auto"
              >
                <Select.HiddenSelect />
                <Select.Label srOnly>Architecture</Select.Label>

                <Select.Control w="full" flex="0 0 auto">
                  <Select.Trigger>
                    <Select.ValueText placeholder="Select architecture" />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>

                <Select.Positioner>
                  <Select.Content>
                    <Select.ItemGroup>
                      <Select.ItemGroupLabel>Architecture</Select.ItemGroupLabel>
                      {ARCHITECTURE_ITEMS.map((opt) => (
                        <Select.Item key={opt.value} item={{ label: opt.label, value: opt.value }}>
                          <Select.ItemText>{opt.label}</Select.ItemText>
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.ItemGroup>
                  </Select.Content>
                </Select.Positioner>
              </Select.Root>
            )}
            <Button
              size="sm"
              onClick={onDownload}
              disabled={downloadDisabled}
              loading={isDownloading}
              colorPalette="primary"
              w={{ base: 'full', sm: 'auto' }}
            >
              <HStack gap="2">
                {isDownloading ? <Loader2 size={16} /> : <Download size={16} />}
                {isDownloading ? 'Downloading…' : 'Download Agent'}
              </HStack>
            </Button>
          </HStack>
        </OrderedList.Item>

        <OrderedList.Item>
          <LabelText fontWeight="semibold">Install the Comp AI Device Agent.</LabelText>
          <BodyText tone="muted" fontSize="sm" mt="1" lineHeight="short">
            {isMacOS
              ? 'Double-click the downloaded DMG file and follow the installation instructions.'
              : 'Double-click the downloaded EXE file and follow the installation instructions.'}
          </BodyText>
        </OrderedList.Item>

        {isMacOS ? (
          <OrderedList.Item>
            <LabelText fontWeight="semibold">Login with your work email.</LabelText>
            <BodyText tone="muted" fontSize="sm" mt="1" lineHeight="short">
              After installation, login with your work email, select your organization and then
              click &quot;Link Device&quot; and &quot;Install Agent&quot;.
            </BodyText>
          </OrderedList.Item>
        ) : (
          <OrderedList.Item>
            <LabelText fontWeight="semibold">Enable MDM.</LabelText>
            <VStack align="stretch" gap="1.5" mt="1">
              <BodyText tone="muted" fontSize="sm">
                Find the Fleet Desktop app in your system tray (bottom right corner). Click on it
                and click My Device.
              </BodyText>
              <BodyText tone="muted" fontSize="sm">
                You should see a banner that asks you to enable MDM. Click the button and follow the
                instructions.
              </BodyText>
              <BodyText tone="muted" fontSize="sm">
                After you&apos;ve enabled MDM, refresh this page and the banner will disappear.
              </BodyText>
            </VStack>
          </OrderedList.Item>
        )}
      </OrderedList>
    </VStack>
  );
}
