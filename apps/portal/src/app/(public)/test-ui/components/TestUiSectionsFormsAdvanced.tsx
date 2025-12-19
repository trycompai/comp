'use client';

import {
  Combobox,
  createListCollection,
  Field,
  FileUpload,
  HStack,
  Select,
  Slider,
  Text,
  VStack,
  type SupportedColorPalette,
} from '@trycompai/ui-v2';
import { useMemo, useState } from 'react';
import { Section, SubSection } from './TestUiPrimitives';

type Option = { label: string; value: string };

export function TestUiSectionsFormsAdvanced({ palette }: { palette: SupportedColorPalette }) {
  const options = useMemo<Option[]>(
    () => [
      { label: 'Engineering', value: 'eng' },
      { label: 'Security', value: 'sec' },
      { label: 'Compliance', value: 'comp' },
      { label: 'Finance', value: 'fin' },
    ],
    [],
  );
  const collection = useMemo(() => createListCollection({ items: options }), [options]);

  const [selectValue, setSelectValue] = useState<string[]>(['eng']);
  const [comboValue, setComboValue] = useState<string[]>([]);
  const [sliderValue, setSliderValue] = useState<number[]>([42]);

  return (
    <Section title="Forms & Inputs (Advanced)">
      <VStack align="stretch" gap={8}>
        <SubSection title="Select (custom)">
          <Select.Root
            value={selectValue}
            onValueChange={(e) => setSelectValue(e.value)}
            collection={collection}
            colorPalette={palette}
          >
            <Select.Label>Department</Select.Label>
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText placeholder="Select department" />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                {options.map((opt) => (
                  <Select.Item key={opt.value} item={opt}>
                    <Select.ItemText>{opt.label}</Select.ItemText>
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        </SubSection>

        <SubSection title="Combobox">
          <Combobox.Root
            value={comboValue}
            onValueChange={(e) => setComboValue(e.value)}
            collection={collection}
            colorPalette={palette}
          >
            <Combobox.Label>Search teams</Combobox.Label>
            <Combobox.Control>
              <Combobox.Input placeholder="Type to search..." />
              <Combobox.IndicatorGroup>
                <Combobox.Trigger />
                <Combobox.ClearTrigger />
              </Combobox.IndicatorGroup>
            </Combobox.Control>
            <Combobox.Positioner>
              <Combobox.Content>
                {options.map((opt) => (
                  <Combobox.Item key={opt.value} item={opt}>
                    <Combobox.ItemText>{opt.label}</Combobox.ItemText>
                    <Combobox.ItemIndicator />
                  </Combobox.Item>
                ))}
                <Combobox.Empty>No results</Combobox.Empty>
              </Combobox.Content>
            </Combobox.Positioner>
          </Combobox.Root>
        </SubSection>

        <SubSection title="Slider">
          <Slider.Root
            value={sliderValue}
            onValueChange={(e) => setSliderValue(e.value)}
            min={0}
            max={100}
            step={1}
            colorPalette={palette}
          >
            <Slider.Label>Security score</Slider.Label>
            <HStack gap={4}>
              <Slider.Control flex="1">
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumb index={0} />
              </Slider.Control>
              <Slider.ValueText minW="12" textAlign="right">
                {sliderValue[0]}
              </Slider.ValueText>
            </HStack>
          </Slider.Root>
          <Text fontSize="sm" color="fg.muted" mt="2">
            Verify thumb focus ring + range contrast.
          </Text>
        </SubSection>

        <SubSection title="FileUpload">
          <Field.Root>
            <Field.Label>Upload policy</Field.Label>
            <FileUpload.Root colorPalette={palette}>
              <FileUpload.HiddenInput />
              <FileUpload.Dropzone>
                <FileUpload.DropzoneContent>
                  Drop files here or <FileUpload.Trigger>browse</FileUpload.Trigger>
                </FileUpload.DropzoneContent>
              </FileUpload.Dropzone>
              <FileUpload.List />
            </FileUpload.Root>
            <Field.HelperText>
              Check dropzone bg/border, hover, and list rendering.
            </Field.HelperText>
          </Field.Root>
        </SubSection>
      </VStack>
    </Section>
  );
}
