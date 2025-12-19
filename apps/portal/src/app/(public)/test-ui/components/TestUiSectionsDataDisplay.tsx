'use client';

import {
  Badge,
  Box,
  Card,
  DataList,
  Grid,
  HStack,
  Stat,
  Status,
  Tag,
  Text,
  Timeline,
  VStack,
  type SupportedColorPalette,
} from '@trycompai/ui-v2';
import { Section, SubSection } from './TestUiPrimitives';

export function TestUiSectionsDataDisplay({ palette }: { palette: SupportedColorPalette }) {
  return (
    <Section title="Data Display">
      <VStack align="stretch" gap={8}>
        <SubSection title="DataList">
          <Card.Root>
            <Card.Body>
              <DataList.Root orientation="horizontal">
                <DataList.Item>
                  <DataList.ItemLabel>Vendor</DataList.ItemLabel>
                  <DataList.ItemValue>Acme, Inc.</DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Status</DataList.ItemLabel>
                  <DataList.ItemValue>
                    <HStack gap="2" align="center">
                      <Status.Root colorPalette={palette}>
                        <Status.Indicator />
                      </Status.Root>
                      <Text>In review</Text>
                    </HStack>
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Owner</DataList.ItemLabel>
                  <DataList.ItemValue>security@comp.ai</DataList.ItemValue>
                </DataList.Item>
              </DataList.Root>
            </Card.Body>
          </Card.Root>
        </SubSection>

        <SubSection title="Stat">
          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6} w="full">
            <Card.Root>
              <Card.Body>
                <Stat.Root>
                  <Stat.Label>Open risks</Stat.Label>
                  <HStack align="baseline" gap="2">
                    <Stat.ValueText>12</Stat.ValueText>
                    <Stat.ValueUnit>items</Stat.ValueUnit>
                  </HStack>
                  <Stat.HelpText>
                    <Stat.DownIndicator />4 vs last week
                  </Stat.HelpText>
                </Stat.Root>
              </Card.Body>
            </Card.Root>

            <Card.Root>
              <Card.Body>
                <Stat.Root>
                  <Stat.Label>Coverage</Stat.Label>
                  <HStack align="baseline" gap="2">
                    <Stat.ValueText>86</Stat.ValueText>
                    <Stat.ValueUnit>%</Stat.ValueUnit>
                  </HStack>
                  <Stat.HelpText>
                    <Stat.UpIndicator />
                    3% this month
                  </Stat.HelpText>
                </Stat.Root>
              </Card.Body>
            </Card.Root>

            <Card.Root>
              <Card.Body>
                <Stat.Root>
                  <Stat.Label>Evidence</Stat.Label>
                  <HStack align="baseline" gap="2">
                    <Stat.ValueText>248</Stat.ValueText>
                    <Stat.ValueUnit>files</Stat.ValueUnit>
                  </HStack>
                  <Stat.HelpText>Updated 2h ago</Stat.HelpText>
                </Stat.Root>
              </Card.Body>
            </Card.Root>
          </Grid>
        </SubSection>

        <SubSection title="Status">
          <HStack gap={4} flexWrap="wrap" align="center">
            <HStack gap="2">
              <Status.Root colorPalette="primary">
                <Status.Indicator />
              </Status.Root>
              <Text>Healthy</Text>
            </HStack>
            <HStack gap="2">
              <Status.Root colorPalette="yellow">
                <Status.Indicator />
              </Status.Root>
              <Text>At risk</Text>
            </HStack>
            <HStack gap="2">
              <Status.Root colorPalette="rose">
                <Status.Indicator />
              </Status.Root>
              <Text>Blocked</Text>
            </HStack>
          </HStack>
        </SubSection>

        <SubSection title="Tag">
          <HStack gap={3} flexWrap="wrap" align="center">
            <Tag.Root colorPalette={palette}>
              <Tag.Label>primary</Tag.Label>
              <Tag.CloseTrigger />
            </Tag.Root>
            <Tag.Root colorPalette="secondary">
              <Tag.Label>secondary</Tag.Label>
              <Tag.CloseTrigger />
            </Tag.Root>
            <Tag.Root colorPalette="sand">
              <Tag.Label>sand</Tag.Label>
              <Tag.CloseTrigger />
            </Tag.Root>
            <Badge colorPalette={palette}>Badge still uses palette</Badge>
          </HStack>
        </SubSection>

        <SubSection title="Timeline">
          <Box borderWidth="1px" borderColor="border" borderRadius="card" p="4">
            <Timeline.Root>
              <Timeline.Item>
                <Timeline.Separator>
                  <Timeline.Indicator>
                    <Status.Root colorPalette={palette}>
                      <Status.Indicator />
                    </Status.Root>
                  </Timeline.Indicator>
                  <Timeline.Connector />
                </Timeline.Separator>
                <Timeline.Content>
                  <Timeline.Title>Vendor connected</Timeline.Title>
                  <Timeline.Description>Acme was added to your workspace.</Timeline.Description>
                </Timeline.Content>
              </Timeline.Item>

              <Timeline.Item>
                <Timeline.Separator>
                  <Timeline.Indicator>
                    <Status.Root colorPalette="yellow">
                      <Status.Indicator />
                    </Status.Root>
                  </Timeline.Indicator>
                  <Timeline.Connector />
                </Timeline.Separator>
                <Timeline.Content>
                  <Timeline.Title>Risk detected</Timeline.Title>
                  <Timeline.Description>Missing DPA for processing PII.</Timeline.Description>
                </Timeline.Content>
              </Timeline.Item>

              <Timeline.Item>
                <Timeline.Separator>
                  <Timeline.Indicator>
                    <Status.Root colorPalette="primary">
                      <Status.Indicator />
                    </Status.Root>
                  </Timeline.Indicator>
                </Timeline.Separator>
                <Timeline.Content>
                  <Timeline.Title>Evidence uploaded</Timeline.Title>
                  <Timeline.Description>Policy.pdf was uploaded and reviewed.</Timeline.Description>
                </Timeline.Content>
              </Timeline.Item>
            </Timeline.Root>
          </Box>
        </SubSection>
      </VStack>
    </Section>
  );
}
