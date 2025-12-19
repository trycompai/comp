'use client';

import {
  ActionBar,
  Box,
  Button,
  Drawer,
  HoverCard,
  Popover,
  Text,
  Tooltip,
  VStack,
  type SupportedColorPalette,
} from '@trycompai/ui-v2';
import { useState } from 'react';
import { Section, SubSection } from './TestUiPrimitives';

export function TestUiSectionsOverlays({ palette }: { palette: SupportedColorPalette }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionBarOpen, setActionBarOpen] = useState(false);

  return (
    <Section title="Overlays">
      <VStack align="stretch" gap={8}>
        <SubSection title="Tooltip">
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button colorPalette={palette} variant="outline">
                Hover me
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>
                <Tooltip.Arrow>
                  <Tooltip.ArrowTip />
                </Tooltip.Arrow>
                Tooltip content
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        </SubSection>

        <SubSection title="Popover">
          <Popover.Root>
            <Popover.Trigger asChild>
              <Button colorPalette={palette}>Open popover</Button>
            </Popover.Trigger>
            <Popover.Positioner>
              <Popover.Content>
                <Popover.Arrow>
                  <Popover.ArrowTip />
                </Popover.Arrow>
                <Popover.Header>
                  <Popover.Title>Popover title</Popover.Title>
                </Popover.Header>
                <Popover.Body>
                  <Popover.Description color="fg.muted">
                    Verify surface background, border, and focus trapping.
                  </Popover.Description>
                </Popover.Body>
                <Popover.Footer display="flex" justifyContent="flex-end" gap="2">
                  <Popover.CloseTrigger asChild>
                    <Button variant="outline" colorPalette={palette}>
                      Close
                    </Button>
                  </Popover.CloseTrigger>
                </Popover.Footer>
              </Popover.Content>
            </Popover.Positioner>
          </Popover.Root>
        </SubSection>

        <SubSection title="HoverCard">
          <HoverCard.Root>
            <HoverCard.Trigger asChild>
              <Button variant="ghost" colorPalette={palette}>
                Hover for details
              </Button>
            </HoverCard.Trigger>
            <HoverCard.Positioner>
              <HoverCard.Content>
                <HoverCard.Arrow>
                  <HoverCard.ArrowTip />
                </HoverCard.Arrow>
                <Text fontWeight="medium">Vendor: Acme</Text>
                <Text fontSize="sm" color="fg.muted" mt="1">
                  SOC 2 Type II • 2025
                </Text>
              </HoverCard.Content>
            </HoverCard.Positioner>
          </HoverCard.Root>
        </SubSection>

        <SubSection title="Drawer">
          <Button colorPalette={palette} onClick={() => setDrawerOpen(true)}>
            Open drawer
          </Button>
          <Drawer.Root open={drawerOpen} onOpenChange={(e) => setDrawerOpen(e.open)}>
            <Drawer.Backdrop />
            <Drawer.Positioner>
              <Drawer.Content>
                <Drawer.Header>
                  <Drawer.Title>Drawer title</Drawer.Title>
                  <Drawer.CloseTrigger asChild>
                    <Button variant="ghost" colorPalette={palette}>
                      Close
                    </Button>
                  </Drawer.CloseTrigger>
                </Drawer.Header>
                <Drawer.Body>
                  <Text color="fg.muted">This checks backdrop, panel bg, and focus ring.</Text>
                </Drawer.Body>
                <Drawer.Footer display="flex" justifyContent="flex-end" gap="2">
                  <Drawer.CloseTrigger asChild>
                    <Button variant="outline" colorPalette={palette}>
                      Cancel
                    </Button>
                  </Drawer.CloseTrigger>
                  <Button colorPalette={palette}>Confirm</Button>
                </Drawer.Footer>
              </Drawer.Content>
            </Drawer.Positioner>
          </Drawer.Root>
        </SubSection>

        <SubSection title="ActionBar">
          <Button
            variant="outline"
            colorPalette={palette}
            onClick={() => setActionBarOpen((v) => !v)}
          >
            Toggle action bar
          </Button>

          <ActionBar.Root open={actionBarOpen} onOpenChange={(e) => setActionBarOpen(e.open)}>
            <ActionBar.Positioner>
              <ActionBar.Content>
                <ActionBar.SelectionTrigger>3 selected</ActionBar.SelectionTrigger>
                <ActionBar.Separator />
                <Button size="sm" colorPalette={palette}>
                  Archive
                </Button>
                <Button size="sm" variant="outline" colorPalette={palette}>
                  Export
                </Button>
                <Box flex="1" />
                <ActionBar.CloseTrigger asChild>
                  <Button size="sm" variant="ghost" colorPalette={palette}>
                    Close
                  </Button>
                </ActionBar.CloseTrigger>
              </ActionBar.Content>
            </ActionBar.Positioner>
          </ActionBar.Root>
        </SubSection>
      </VStack>
    </Section>
  );
}
