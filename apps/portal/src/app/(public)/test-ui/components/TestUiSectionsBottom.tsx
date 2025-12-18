'use client';

import {
  Alert,
  Badge,
  Box,
  Button,
  Code,
  Dialog,
  Grid,
  Heading,
  HStack,
  Link,
  Menu,
  Separator,
  Table,
  Tabs,
  Text,
  VStack,
} from '@trycompai/ui-new';
import { useState } from 'react';
import { Section, SubSection } from './TestUiPrimitives';

export function TestUiSectionsBottom() {
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
        <Tabs.Root defaultValue="tab1" colorPalette="primary">
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
            <Button variant="outline">Open Menu</Button>
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
        <DialogExample />
      </Section>

      <Section title="Typography">
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8}>
          <VStack align="start" gap={3}>
            <Heading size="2xl">Heading 2XL</Heading>
            <Heading size="xl">Heading XL</Heading>
            <Heading size="lg">Heading LG</Heading>
            <Heading size="md">Heading MD</Heading>
            <Heading size="sm">Heading SM</Heading>
          </VStack>
          <VStack align="start" gap={3}>
            <Text fontSize="xl">Text XL</Text>
            <Text fontSize="lg">Text LG</Text>
            <Text fontSize="md">Text MD (default)</Text>
            <Text fontSize="sm">Text SM</Text>
            <Text fontSize="xs">Text XS</Text>
            <Separator />
            <Text color="secondary.700">Muted text (secondary.700)</Text>
            <Text color="secondary.600">Subtle text (secondary.600)</Text>
            <Link href="#">Link text</Link>
            <Code>inline code</Code>
          </VStack>
        </Grid>
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

function DialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Dialog</Button>
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
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setOpen(false)}>Confirm</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  );
}
