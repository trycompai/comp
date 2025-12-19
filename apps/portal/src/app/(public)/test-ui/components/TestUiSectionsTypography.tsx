'use client';

import {
  Blockquote,
  Code,
  CodeBlock,
  Em,
  Grid,
  Heading,
  Highlight,
  Kbd,
  Link,
  List,
  Mark,
  Quote,
  Separator,
  Strong,
  Text,
  VStack,
} from '@trycompai/ui-v2';
import { Section, SubSection } from './TestUiPrimitives';

const SAMPLE_CODE = `import { Button } from '@trycompai/ui-v2'

export function Example() {
  return <Button colorPalette="primary">Click</Button>
}
`;

export function TestUiSectionsTypography() {
  return (
    <Section title="Typography & Content">
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8}>
        <VStack align="start" gap={4}>
          <SubSection title="Headings">
            <VStack align="start" gap={2}>
              <Heading size="2xl">Heading 2XL</Heading>
              <Heading size="xl">Heading XL</Heading>
              <Heading size="lg">Heading LG</Heading>
              <Heading size="md">Heading MD</Heading>
              <Heading size="sm">Heading SM</Heading>
            </VStack>
          </SubSection>

          <SubSection title="Text / Inline">
            <VStack align="start" gap={2}>
              <Text fontSize="lg">
                This is a <Strong>strong</Strong> word, an <Em>emphasized</Em> word, and a{' '}
                <Mark>highlighted</Mark> word.
              </Text>
              <Text fontSize="sm" color="fg.muted">
                Shortcut: <Kbd>⌘</Kbd> <Kbd>K</Kbd>
              </Text>
              <Text fontSize="sm">
                Quoted text: <Quote>quality over quantity</Quote>
              </Text>
              <Text fontSize="sm">
                Inline code: <Code>const x = 1</Code>
              </Text>
              <Text fontSize="sm">
                Link:{' '}
                <Link href="#" colorPalette="primary">
                  comp.ai
                </Link>
              </Text>
              <Separator />
              <Text fontSize="sm">
                <Highlight
                  query={['Comp AI', 'design system']}
                  styles={{ bg: 'bg.muted', px: '1' }}
                >
                  Comp AI design system: consistent tokens, consistent recipes.
                </Highlight>
              </Text>
            </VStack>
          </SubSection>

          <SubSection title="List">
            <List.Root>
              <List.Item>Design tokens are the source of truth</List.Item>
              <List.Item>Recipes consume semantic tokens</List.Item>
              <List.Item>Typegen after theme changes</List.Item>
            </List.Root>
          </SubSection>
        </VStack>

        <VStack align="start" gap={4}>
          <SubSection title="Blockquote">
            <Blockquote.Root variant="subtle">
              <Blockquote.Icon />
              <Blockquote.Content>
                <Text>
                  If you can’t regenerate the types, you can’t trust the props. Make typegen a
                  first-class step.
                </Text>
                <Blockquote.Caption>Design system rule</Blockquote.Caption>
              </Blockquote.Content>
            </Blockquote.Root>
          </SubSection>

          <SubSection title="Code Block">
            <CodeBlock.Root code={SAMPLE_CODE} language="tsx">
              <CodeBlock.Header>
                <CodeBlock.Title>Example.tsx</CodeBlock.Title>
                <CodeBlock.Control>
                  <CodeBlock.CopyTrigger>
                    <CodeBlock.CopyIndicator copied="Copied">Copy</CodeBlock.CopyIndicator>
                  </CodeBlock.CopyTrigger>
                </CodeBlock.Control>
              </CodeBlock.Header>
              <CodeBlock.Content>
                <CodeBlock.Code>
                  <CodeBlock.CodeText />
                </CodeBlock.Code>
              </CodeBlock.Content>
            </CodeBlock.Root>
          </SubSection>
        </VStack>
      </Grid>
    </Section>
  );
}
