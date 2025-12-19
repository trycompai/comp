'use client';

import {
  Accordion,
  Box,
  Collapsible,
  HStack,
  Text,
  VStack,
  type SupportedColorPalette,
} from '@trycompai/ui-v2';
import { Section, SubSection } from './TestUiPrimitives';

export function TestUiSectionsDisclosure({ palette }: { palette: SupportedColorPalette }) {
  return (
    <Section title="Disclosure">
      <VStack align="stretch" gap={8}>
        <SubSection title="Accordion">
          <Accordion.Root collapsible colorPalette={palette}>
            <Accordion.Item value="a">
              <Accordion.ItemTrigger>
                <HStack justify="space-between" w="full">
                  <Text fontWeight="medium">How does palette work?</Text>
                  <Accordion.ItemIndicator />
                </HStack>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent>
                <Accordion.ItemBody color="fg.muted">
                  Components read `colorPalette.*` semantic tokens, so light/dark mode and contrast
                  behave consistently.
                </Accordion.ItemBody>
              </Accordion.ItemContent>
            </Accordion.Item>

            <Accordion.Item value="b">
              <Accordion.ItemTrigger>
                <HStack justify="space-between" w="full">
                  <Text fontWeight="medium">Why recipes?</Text>
                  <Accordion.ItemIndicator />
                </HStack>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent>
                <Accordion.ItemBody color="fg.muted">
                  Recipes keep component styling centralized and reusable across the system.
                </Accordion.ItemBody>
              </Accordion.ItemContent>
            </Accordion.Item>
          </Accordion.Root>
        </SubSection>

        <SubSection title="Collapsible">
          <Collapsible.Root defaultOpen colorPalette={palette}>
            <Collapsible.Trigger>
              <HStack justify="space-between" w="full">
                <Text fontWeight="medium">Toggle details</Text>
                <Collapsible.Indicator />
              </HStack>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <Box pt="3" color="fg.muted">
                This checks disclosure animations + border/radius tokens.
              </Box>
            </Collapsible.Content>
          </Collapsible.Root>
        </SubSection>
      </VStack>
    </Section>
  );
}
