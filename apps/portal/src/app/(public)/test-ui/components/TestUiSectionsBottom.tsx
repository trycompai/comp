'use client';

import {
  Alert,
  Badge,
  Box,
  Button,
  Dialog,
  HStack,
  Menu,
  Table,
  Tabs,
  Text,
  VStack,
  type SupportedColorPalette,
} from '@trycompai/ui-v2';
import { useState } from 'react';
import { Section, SubSection } from './TestUiPrimitives';

export function TestUiSectionsBottom({ palette }: { palette: SupportedColorPalette }) {
  return (
    <>
      <Section title="Alerts">
        <VStack align="stretch" gap={4}>
          <Alert.Root status="info">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Info Alert</Alert.Title>
              <Alert.Description>This is an informational message.</Alert.Description>
            </Alert.Content>
          </Alert.Root>
          <Alert.Root status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Success Alert</Alert.Title>
              <Alert.Description>Operation completed successfully.</Alert.Description>
            </Alert.Content>
          </Alert.Root>
          <Alert.Root status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Warning Alert</Alert.Title>
              <Alert.Description>Please review before proceeding.</Alert.Description>
            </Alert.Content>
          </Alert.Root>
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Error Alert</Alert.Title>
              <Alert.Description>Something went wrong.</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        </VStack>
      </Section>

      <Section title="Tabs">
        <Tabs.Root defaultValue="tab1" colorPalette={palette}>
          <Tabs.List>
            <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Settings</Tabs.Trigger>
            <Tabs.Trigger value="tab3">Analytics</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="tab1">
            <Box p={4}>
              <Text>Overview content goes here</Text>
            </Box>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <Box p={4}>
              <Text>Settings content goes here</Text>
            </Box>
          </Tabs.Content>
          <Tabs.Content value="tab3">
            <Box p={4}>
              <Text>Analytics content goes here</Text>
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Section>

      <Section title="Table">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Name</Table.ColumnHeader>
              <Table.ColumnHeader>Status</Table.ColumnHeader>
              <Table.ColumnHeader>Role</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell>John Doe</Table.Cell>
              <Table.Cell>
                <Badge colorPalette="primary">Active</Badge>
              </Table.Cell>
              <Table.Cell>Admin</Table.Cell>
              <Table.Cell textAlign="right">
                <Button size="sm" variant="ghost">
                  Edit
                </Button>
              </Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Jane Smith</Table.Cell>
              <Table.Cell>
                <Badge colorPalette="yellow">Pending</Badge>
              </Table.Cell>
              <Table.Cell>User</Table.Cell>
              <Table.Cell textAlign="right">
                <Button size="sm" variant="ghost">
                  Edit
                </Button>
              </Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Bob Johnson</Table.Cell>
              <Table.Cell>
                <Badge colorPalette="orange">Inactive</Badge>
              </Table.Cell>
              <Table.Cell>User</Table.Cell>
              <Table.Cell textAlign="right">
                <Button size="sm" variant="ghost">
                  Edit
                </Button>
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </Section>

      <Section title="Menu">
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button colorPalette={palette} variant="outline">
              Open Menu
            </Button>
          </Menu.Trigger>
          <Menu.Positioner>
            <Menu.Content>
              <Menu.Item value="edit">Edit</Menu.Item>
              <Menu.Item value="duplicate">Duplicate</Menu.Item>
              <Menu.Separator />
              <Menu.Item value="delete" color="orange.600">
                Delete
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>
      </Section>

      <Section title="Dialog">
        <DialogExample palette={palette} />
      </Section>

      <Section title="Spacing & Radius">
        <SubSection title="Border Radius">
          <HStack gap={4} flexWrap="wrap">
            <Box bg="primary.100" p={4} borderRadius="sm">
              sm
            </Box>
            <Box bg="primary.200" p={4} borderRadius="md">
              md
            </Box>
            <Box bg="primary.300" p={4} borderRadius="lg">
              lg
            </Box>
            <Box bg="primary.400" p={4} borderRadius="xl">
              xl
            </Box>
            <Box bg="primary.500" p={4} borderRadius="2xl" color="white">
              2xl
            </Box>
            <Box bg="primary.600" p={4} borderRadius="full" color="white">
              full
            </Box>
          </HStack>
        </SubSection>
      </Section>
    </>
  );
}

function DialogExample({ palette }: { palette: SupportedColorPalette }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button colorPalette={palette} onClick={() => setOpen(true)}>
        Open Dialog
      </Button>
      <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Dialog Title</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>This is the dialog content.</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Button colorPalette={palette} variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button colorPalette={palette} onClick={() => setOpen(false)}>
                Confirm
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  );
}
