'use client';

import {
  Button,
  HStack,
  Loader,
  Presence,
  ProgressCircle,
  Spinner,
  Text,
  VStack,
  type SupportedColorPalette,
} from '@trycompai/ui-v2';
import { useState } from 'react';
import { toast } from 'sonner';
import { Section, SubSection } from './TestUiPrimitives';

export function TestUiSectionsFeedback({ palette }: { palette: SupportedColorPalette }) {
  const [present, setPresent] = useState(true);

  return (
    <Section title="Feedback & Async">
      <VStack align="stretch" gap={8}>
        <SubSection title="Toasts (sonner)">
          <HStack gap={3} flexWrap="wrap">
            <Button
              colorPalette={palette}
              onClick={() =>
                toast.success('Saved', {
                  description: 'Changes were persisted successfully.',
                })
              }
            >
              Success toast
            </Button>
            <Button
              colorPalette="rose"
              variant="outline"
              onClick={() =>
                toast.error('Failed', {
                  description: 'Something went wrong.',
                })
              }
            >
              Error toast
            </Button>
            <Button
              colorPalette={palette}
              variant="ghost"
              onClick={() =>
                toast.promise(new Promise((resolve) => setTimeout(resolve, 800)), {
                  loading: 'Saving…',
                  success: 'Saved',
                  error: 'Failed',
                })
              }
            >
              Promise toast
            </Button>
          </HStack>
          <Text fontSize="sm" color="fg.muted" mt="2">
            Toaster is mounted in `apps/portal/src/app/layout.tsx`.
          </Text>
        </SubSection>

        <SubSection title="Loader / Spinner">
          <HStack gap={6} flexWrap="wrap" align="center">
            <Loader />
            <Spinner colorPalette={palette} />
            <Spinner size="lg" colorPalette={palette} />
          </HStack>
        </SubSection>

        <SubSection title="Presence">
          <HStack gap={3} flexWrap="wrap" align="center">
            <Button variant="outline" colorPalette={palette} onClick={() => setPresent((v) => !v)}>
              Toggle presence
            </Button>
            <Presence present={present}>
              <Text p="3" borderWidth="1px" borderColor="border" borderRadius="card">
                Animated presence content
              </Text>
            </Presence>
          </HStack>
        </SubSection>

        <SubSection title="ProgressCircle">
          <HStack gap={8} flexWrap="wrap" align="center">
            <ProgressCircle.Root value={35} colorPalette={palette}>
              <ProgressCircle.Circle>
                <ProgressCircle.Track />
                <ProgressCircle.Range />
              </ProgressCircle.Circle>
              <ProgressCircle.ValueText />
            </ProgressCircle.Root>
            <ProgressCircle.Root value={80} colorPalette={palette}>
              <ProgressCircle.Circle>
                <ProgressCircle.Track />
                <ProgressCircle.Range />
              </ProgressCircle.Circle>
              <ProgressCircle.ValueText />
            </ProgressCircle.Root>
          </HStack>
        </SubSection>
      </VStack>
    </Section>
  );
}
