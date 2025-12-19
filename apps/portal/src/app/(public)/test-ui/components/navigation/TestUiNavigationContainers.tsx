'use client';

import {
  Button,
  Carousel,
  createTreeCollection,
  EmptyState,
  HStack,
  ScrollArea,
  Splitter,
  Text,
  TreeView,
  VStack,
  type SupportedColorPalette,
  type TreeNode,
} from '@trycompai/ui-v2';
import { useMemo } from 'react';
import { SubSection } from '../TestUiPrimitives';

type DemoTreeNode = TreeNode & { children?: DemoTreeNode[] };

export function TestUiNavigationContainers({ palette }: { palette: SupportedColorPalette }) {
  const treeCollection = useMemo(() => {
    const rootNode: DemoTreeNode = {
      id: 'root',
      value: 'root',
      label: 'Root',
      children: [
        {
          id: 'policies',
          value: 'policies',
          label: 'Policies',
          children: [{ id: 'dpa', value: 'dpa', label: 'DPA' }],
        },
        {
          id: 'vendors',
          value: 'vendors',
          label: 'Vendors',
          children: [{ id: 'acme', value: 'acme', label: 'Acme' }],
        },
      ],
    };

    return createTreeCollection<DemoTreeNode>({
      rootNode,
      nodeToValue: (node) => String(node.value),
      nodeToString: (node) => String(node.label),
      nodeToChildren: (node) => node.children ?? [],
      nodeToChildrenCount: (node) => node.children?.length,
      isNodeDisabled: () => false,
    });
  }, []);

  return (
    <>
      <SubSection title="ScrollArea">
        <ScrollArea.Root h="160px" borderWidth="1px" borderColor="border" borderRadius="card">
          <ScrollArea.Viewport p="4">
            <VStack align="start" gap="3">
              {Array.from({ length: 12 }).map((_, i) => (
                <Text key={i} fontSize="sm">
                  Line {i + 1}: scroll check
                </Text>
              ))}
            </VStack>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical">
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
          <ScrollArea.Corner />
        </ScrollArea.Root>
      </SubSection>

      <SubSection title="Splitter">
        <Splitter.Root
          orientation="horizontal"
          panels={[
            { id: 'left', minSize: 10 },
            { id: 'right', minSize: 10 },
          ]}
          defaultSize={[40, 60]}
          borderWidth="1px"
          borderColor="border"
          borderRadius="card"
          overflow="hidden"
        >
          <Splitter.Panel id="left" p="4">
            <Text fontWeight="medium">Left panel</Text>
            <Text fontSize="sm" color="fg.muted" mt="2">
              Drag the handle.
            </Text>
          </Splitter.Panel>
          <Splitter.ResizeTrigger id="left:right">
            <Splitter.ResizeTriggerIndicator />
          </Splitter.ResizeTrigger>
          <Splitter.Panel id="right" p="4">
            <Text fontWeight="medium">Right panel</Text>
            <Text fontSize="sm" color="fg.muted" mt="2">
              Check cursor + focus ring.
            </Text>
          </Splitter.Panel>
        </Splitter.Root>
      </SubSection>

      <SubSection title="TreeView">
        <TreeView.Root collection={treeCollection} selectionMode="single" colorPalette={palette}>
          <TreeView.Label>Files</TreeView.Label>
          <TreeView.Tree mt="2">
            <TreeView.Node
              indentGuide={<TreeView.BranchIndentGuide />}
              render={({ node, nodeState }) => {
                const isBranch = nodeState.isBranch;
                return isBranch ? (
                  <TreeView.Branch>
                    <TreeView.BranchControl>
                      <TreeView.BranchTrigger>
                        <TreeView.BranchIndicator />
                        <TreeView.BranchText>{String(node.label)}</TreeView.BranchText>
                      </TreeView.BranchTrigger>
                    </TreeView.BranchControl>
                    <TreeView.BranchContent />
                  </TreeView.Branch>
                ) : (
                  <TreeView.Item>
                    <TreeView.ItemIndicator />
                    <TreeView.ItemText>{String(node.label)}</TreeView.ItemText>
                  </TreeView.Item>
                );
              }}
            />
          </TreeView.Tree>
        </TreeView.Root>
      </SubSection>

      <SubSection title="EmptyState">
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Indicator />
            <EmptyState.Title>No results</EmptyState.Title>
            <EmptyState.Description>Try changing filters or search.</EmptyState.Description>
          </EmptyState.Content>
        </EmptyState.Root>
      </SubSection>

      <SubSection title="Carousel">
        <Carousel.Root slideCount={3} loop spacing="12px" allowMouseDrag>
          <Carousel.ItemGroup>
            <Carousel.Item index={0}>
              <Text p="6" borderWidth="1px" borderColor="border" borderRadius="card">
                Slide 1
              </Text>
            </Carousel.Item>
            <Carousel.Item index={1}>
              <Text p="6" borderWidth="1px" borderColor="border" borderRadius="card">
                Slide 2
              </Text>
            </Carousel.Item>
            <Carousel.Item index={2}>
              <Text p="6" borderWidth="1px" borderColor="border" borderRadius="card">
                Slide 3
              </Text>
            </Carousel.Item>
          </Carousel.ItemGroup>
          <HStack mt="3" gap="2" align="center">
            <Carousel.PrevTrigger asChild>
              <Button size="sm" variant="outline" colorPalette={palette}>
                Prev
              </Button>
            </Carousel.PrevTrigger>
            <Carousel.NextTrigger asChild>
              <Button size="sm" variant="outline" colorPalette={palette}>
                Next
              </Button>
            </Carousel.NextTrigger>
            <Carousel.Indicators />
            <Carousel.ProgressText />
          </HStack>
        </Carousel.Root>
      </SubSection>
    </>
  );
}
