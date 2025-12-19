'use client';

import {
  Button,
  Clipboard,
  DownloadTrigger,
  HStack,
  Portal,
  QrCode,
  Show,
  Text,
  Toggle,
  VStack,
  VisuallyHidden,
  type SupportedColorPalette,
} from '@trycompai/ui-v2';
import { useState } from 'react';
import { Section, SubSection } from './TestUiPrimitives';

export function TestUiSectionsUtilities({ palette }: { palette: SupportedColorPalette }) {
  const [toggled, setToggled] = useState(false);

  return (
    <Section title="Utilities & Helpers">
      <VStack align="stretch" gap={8}>
        <SubSection title="Clipboard">
          <Clipboard.Root value="https://comp.ai" timeout={1200}>
            <Clipboard.Label>Copy link</Clipboard.Label>
            <Clipboard.Control>
              <Clipboard.Input />
              <Clipboard.Trigger asChild>
                <Button size="sm" colorPalette={palette}>
                  <Clipboard.CopyText />
                </Button>
              </Clipboard.Trigger>
              <Clipboard.Indicator copied="Copied">Copy</Clipboard.Indicator>
            </Clipboard.Control>
          </Clipboard.Root>
        </SubSection>

        <SubSection title="QrCode">
          <HStack gap={6} flexWrap="wrap" align="center">
            <QrCode.Root value="https://comp.ai">
              <QrCode.Frame boxSize="140px">
                <QrCode.Pattern />
              </QrCode.Frame>
            </QrCode.Root>
            <Text fontSize="sm" color="fg.muted">
              Check contrast + crisp rendering.
            </Text>
          </HStack>
        </SubSection>

        <SubSection title="DownloadTrigger">
          <DownloadTrigger
            data={new Blob(['hello from comp'], { type: 'text/plain' })}
            fileName="comp.txt"
            mimeType="text/plain"
          >
            Download text file
          </DownloadTrigger>
          <Text fontSize="sm" color="fg.muted" mt="2">
            This is a button-like primitive; check styles and focus ring.
          </Text>
        </SubSection>

        <SubSection title="Toggle / Show / VisuallyHidden / Portal">
          <HStack gap={3} flexWrap="wrap" align="center">
            <Toggle.Root
              pressed={toggled}
              onPressedChange={(pressed) => setToggled(pressed)}
              colorPalette={palette}
            >
              <Toggle.Indicator>{toggled ? 'On' : 'Off'}</Toggle.Indicator>
            </Toggle.Root>

            <Show when={toggled} fallback={<Text color="fg.muted">Toggle is off</Text>}>
              <Text>Toggle is on</Text>
            </Show>

            <Button variant="outline" colorPalette={palette}>
              <VisuallyHidden>Accessible label</VisuallyHidden>
              Visible button text
            </Button>
          </HStack>

          <Portal>
            <Text fontSize="xs" color="fg.muted" mt="2">
              (Portal) If you see this at the end of the DOM tree, portal works.
            </Text>
          </Portal>
        </SubSection>
      </VStack>
    </Section>
  );
}
