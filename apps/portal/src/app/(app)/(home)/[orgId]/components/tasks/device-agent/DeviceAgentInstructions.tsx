'use client';

import type { SupportedOS } from '@/utils/os';
import { Box, Button, createListCollection, HStack, Select, Text, VStack } from '@trycompai/ui-v2';
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

const ARCHITECTURE_COLLECTION = createListCollection({
  items: ARCHITECTURE_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
});

export function DeviceAgentInstructions({
  isMacOS,
  detectedOS,
  onChangeDetectedOS,
  onDownload,
  isDownloading,
  downloadDisabled,
}: DeviceAgentInstructionsProps) {
  return (
    <VStack align="stretch" gap="3">
      <Box
        as="ol"
        listStyleType="decimal"
        ps="4"
        fontSize="sm"
        display="flex"
        flexDirection="column"
        gap="3"
      >
        <Box as="li">
          <Text as="span" fontWeight="semibold" fontSize="sm">
            Download the Device Agent installer.
          </Text>
          <Text fontSize="sm" color="fg.muted" marginTop="1" lineHeight="short">
            Click the download button below to get the Device Agent installer.
          </Text>
          <HStack
            gap="2"
            marginTop="2"
            align="center"
            justify="flex-start"
            flexWrap={{ base: 'wrap', sm: 'nowrap' }}
          >
            {isMacOS && (
              <Select.Root
                collection={ARCHITECTURE_COLLECTION}
                value={[detectedOS ?? 'macos']}
                onValueChange={(e) => {
                  const next = (e.value[0] ?? 'macos') as SupportedOS;
                  onChangeDetectedOS(next);
                }}
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
                      {ARCHITECTURE_OPTIONS.map((opt) => (
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
                {isDownloading ? <Loader2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                <Text as="span" fontSize="sm">
                  {isDownloading ? 'Downloading…' : 'Download Agent'}
                </Text>
              </HStack>
            </Button>
          </HStack>
        </Box>

        <Box as="li">
          <Text as="span" fontWeight="semibold" fontSize="sm">
            Install the Comp AI Device Agent.
          </Text>
          <Text fontSize="sm" color="fg.muted" marginTop="1" lineHeight="short">
            {isMacOS
              ? 'Double-click the downloaded DMG file and follow the installation instructions.'
              : 'Double-click the downloaded EXE file and follow the installation instructions.'}
          </Text>
        </Box>

        {isMacOS ? (
          <Box as="li">
            <Text as="span" fontWeight="semibold" fontSize="sm">
              Login with your work email.
            </Text>
            <Text fontSize="sm" color="fg.muted" marginTop="1" lineHeight="short">
              After installation, login with your work email, select your organization and then
              click &quot;Link Device&quot; and &quot;Install Agent&quot;.
            </Text>
          </Box>
        ) : (
          <Box as="li">
            <Text as="span" fontWeight="semibold" fontSize="sm">
              Enable MDM.
            </Text>
            <VStack align="stretch" gap="1.5" marginTop="1">
              <Text fontSize="sm" color="fg.muted">
                Find the Fleet Desktop app in your system tray (bottom right corner). Click on it
                and click My Device.
              </Text>
              <Text fontSize="sm" color="fg.muted">
                You should see a banner that asks you to enable MDM. Click the button and follow the
                instructions.
              </Text>
              <Text fontSize="sm" color="fg.muted">
                After you&apos;ve enabled MDM, refresh this page and the banner will disappear.
              </Text>
            </VStack>
          </Box>
        )}
      </Box>
    </VStack>
  );
}
