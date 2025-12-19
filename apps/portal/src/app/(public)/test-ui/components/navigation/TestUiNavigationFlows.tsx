'use client';

import {
  Button,
  HStack,
  SegmentGroup,
  Steps,
  Text,
  type SupportedColorPalette,
} from '@trycompai/ui-v2';
import { useState } from 'react';
import { SubSection } from '../TestUiPrimitives';

export function TestUiNavigationFlows({ palette }: { palette: SupportedColorPalette }) {
  const [segment, setSegment] = useState('overview');
  const [step, setStep] = useState(0);

  return (
    <>
      <SubSection title="Steps">
        <Steps.Root
          count={3}
          step={step}
          onStepChange={(e) => setStep(e.step)}
          colorPalette={palette}
        >
          <Steps.List>
            <Steps.Item index={0}>
              <Steps.Trigger>
                <Steps.Indicator />
                <Steps.Title>Connect</Steps.Title>
              </Steps.Trigger>
              <Steps.Separator />
            </Steps.Item>
            <Steps.Item index={1}>
              <Steps.Trigger>
                <Steps.Indicator />
                <Steps.Title>Review</Steps.Title>
              </Steps.Trigger>
              <Steps.Separator />
            </Steps.Item>
            <Steps.Item index={2}>
              <Steps.Trigger>
                <Steps.Indicator />
                <Steps.Title>Approve</Steps.Title>
              </Steps.Trigger>
            </Steps.Item>
          </Steps.List>

          <Steps.Content index={0}>
            <Text color="fg.muted">Step 1 content</Text>
          </Steps.Content>
          <Steps.Content index={1}>
            <Text color="fg.muted">Step 2 content</Text>
          </Steps.Content>
          <Steps.Content index={2}>
            <Text color="fg.muted">Step 3 content</Text>
          </Steps.Content>

          <HStack mt="4" gap="2">
            <Steps.PrevTrigger asChild>
              <Button size="sm" variant="outline" colorPalette={palette}>
                Back
              </Button>
            </Steps.PrevTrigger>
            <Steps.NextTrigger asChild>
              <Button size="sm" colorPalette={palette}>
                Next
              </Button>
            </Steps.NextTrigger>
          </HStack>
        </Steps.Root>
      </SubSection>

      <SubSection title="SegmentGroup">
        <SegmentGroup.Root
          value={segment}
          onValueChange={(e) => setSegment(e.value ?? 'overview')}
          colorPalette={palette}
        >
          <SegmentGroup.Items
            items={[
              { value: 'overview', label: 'Overview' },
              { value: 'evidence', label: 'Evidence' },
              { value: 'settings', label: 'Settings' },
            ]}
          />
          <SegmentGroup.Indicator />
        </SegmentGroup.Root>
      </SubSection>
    </>
  );
}
