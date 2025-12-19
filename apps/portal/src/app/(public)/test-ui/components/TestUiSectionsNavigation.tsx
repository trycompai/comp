'use client';

import { VStack, type SupportedColorPalette } from '@trycompai/ui-v2';
import { Section } from './TestUiPrimitives';

import { TestUiNavigationBasics } from './navigation/TestUiNavigationBasics';
import { TestUiNavigationContainers } from './navigation/TestUiNavigationContainers';
import { TestUiNavigationFlows } from './navigation/TestUiNavigationFlows';

export function TestUiSectionsNavigation({ palette }: { palette: SupportedColorPalette }) {
  return (
    <Section title="Navigation">
      <VStack align="stretch" gap={8}>
        <TestUiNavigationBasics palette={palette} />
        <TestUiNavigationFlows palette={palette} />
        <TestUiNavigationContainers palette={palette} />
      </VStack>
    </Section>
  );
}
