'use client';

import {
  CheckboxCard,
  Field,
  HStack,
  RadioCard,
  RadioGroup,
  RatingGroup,
  Switch,
  TagsInput,
  Text,
  VStack,
  type SupportedColorPalette,
} from '@trycompai/ui-v2';
import { useMemo, useState } from 'react';
import { Section, SubSection } from './TestUiPrimitives';

export function TestUiSectionsFormsSelection({ palette }: { palette: SupportedColorPalette }) {
  const [radio, setRadio] = useState('soc2');
  const [radioCard, setRadioCard] = useState('startup');
  const [rating, setRating] = useState(4);
  const [tags, setTags] = useState<string[]>(['vendor', 'critical']);

  const checkboxCards = useMemo(
    () => [
      { value: 'pii', label: 'PII', description: 'User identifiers and personal data.' },
      { value: 'phi', label: 'PHI', description: 'Health data.' },
      { value: 'pci', label: 'PCI', description: 'Card payment data.' },
    ],
    [],
  );

  return (
    <Section title="Forms & Inputs (Selection)">
      <VStack align="stretch" gap={8}>
        <SubSection title="Switch">
          <HStack gap={6} flexWrap="wrap" align="center">
            <Switch.Root defaultChecked colorPalette={palette}>
              <Switch.HiddenInput />
              <Switch.Control />
              <Switch.Label>Enable feature</Switch.Label>
            </Switch.Root>
            <Switch.Root colorPalette="secondary">
              <Switch.HiddenInput />
              <Switch.Control />
              <Switch.Label>Secondary palette</Switch.Label>
            </Switch.Root>
          </HStack>
        </SubSection>

        <SubSection title="RadioGroup">
          <RadioGroup.Root
            value={radio}
            onValueChange={(e) => setRadio(e.value ?? 'soc2')}
            colorPalette={palette}
          >
            <RadioGroup.Label>Compliance framework</RadioGroup.Label>
            <HStack gap={4} flexWrap="wrap">
              <RadioGroup.Item value="soc2">
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemControl>
                  <RadioGroup.ItemIndicator />
                </RadioGroup.ItemControl>
                <RadioGroup.ItemText>SOC 2</RadioGroup.ItemText>
              </RadioGroup.Item>
              <RadioGroup.Item value="iso27001">
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemControl>
                  <RadioGroup.ItemIndicator />
                </RadioGroup.ItemControl>
                <RadioGroup.ItemText>ISO 27001</RadioGroup.ItemText>
              </RadioGroup.Item>
              <RadioGroup.Item value="hipaa">
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemControl>
                  <RadioGroup.ItemIndicator />
                </RadioGroup.ItemControl>
                <RadioGroup.ItemText>HIPAA</RadioGroup.ItemText>
              </RadioGroup.Item>
            </HStack>
          </RadioGroup.Root>
        </SubSection>

        <SubSection title="RadioCard">
          <RadioCard.Root
            value={radioCard}
            onValueChange={(e) => setRadioCard(e.value ?? 'startup')}
            colorPalette={palette}
          >
            <RadioCard.Label>Company stage</RadioCard.Label>
            <HStack gap={4} flexWrap="wrap">
              <RadioCard.Item value="startup">
                <RadioCard.ItemHiddenInput />
                <RadioCard.ItemControl>
                  <RadioCard.ItemContent>
                    <RadioCard.ItemText>Startup</RadioCard.ItemText>
                    <RadioCard.ItemDescription>1–50 employees</RadioCard.ItemDescription>
                  </RadioCard.ItemContent>
                  <RadioCard.ItemIndicator />
                </RadioCard.ItemControl>
              </RadioCard.Item>
              <RadioCard.Item value="growth">
                <RadioCard.ItemHiddenInput />
                <RadioCard.ItemControl>
                  <RadioCard.ItemContent>
                    <RadioCard.ItemText>Growth</RadioCard.ItemText>
                    <RadioCard.ItemDescription>51–250 employees</RadioCard.ItemDescription>
                  </RadioCard.ItemContent>
                  <RadioCard.ItemIndicator />
                </RadioCard.ItemControl>
              </RadioCard.Item>
              <RadioCard.Item value="enterprise">
                <RadioCard.ItemHiddenInput />
                <RadioCard.ItemControl>
                  <RadioCard.ItemContent>
                    <RadioCard.ItemText>Enterprise</RadioCard.ItemText>
                    <RadioCard.ItemDescription>250+ employees</RadioCard.ItemDescription>
                  </RadioCard.ItemContent>
                  <RadioCard.ItemIndicator />
                </RadioCard.ItemControl>
              </RadioCard.Item>
            </HStack>
          </RadioCard.Root>
        </SubSection>

        <SubSection title="CheckboxCard">
          <CheckboxCard.Root colorPalette={palette}>
            <CheckboxCard.Label>Data types handled</CheckboxCard.Label>
            <VStack align="stretch" gap={3}>
              {checkboxCards.map((item) => (
                <CheckboxCard.Root key={item.value} value={item.value} defaultChecked>
                  <CheckboxCard.HiddenInput />
                  <CheckboxCard.Control>
                    <CheckboxCard.Content>
                      <CheckboxCard.Label>{item.label}</CheckboxCard.Label>
                      <CheckboxCard.Description>{item.description}</CheckboxCard.Description>
                    </CheckboxCard.Content>
                    <CheckboxCard.Indicator />
                  </CheckboxCard.Control>
                </CheckboxCard.Root>
              ))}
            </VStack>
          </CheckboxCard.Root>
          <Text fontSize="sm" color="fg.muted" mt="2">
            Check card borders, hover, and checked indicator.
          </Text>
        </SubSection>

        <SubSection title="RatingGroup">
          <RatingGroup.Root
            value={rating}
            onValueChange={(e) => setRating(e.value)}
            colorPalette={palette}
          >
            <RatingGroup.Label>Vendor risk</RatingGroup.Label>
            <RatingGroup.Control>
              <RatingGroup.Items>
                {Array.from({ length: 5 }).map((_, index) => (
                  <RatingGroup.Item key={index} index={index + 1}>
                    <RatingGroup.ItemIndicator />
                  </RatingGroup.Item>
                ))}
              </RatingGroup.Items>
            </RatingGroup.Control>
            <RatingGroup.HiddenInput />
          </RatingGroup.Root>
        </SubSection>

        <SubSection title="TagsInput">
          <Field.Root>
            <Field.Label>Labels</Field.Label>
            <TagsInput.Root
              value={tags}
              onValueChange={(e) => setTags(e.value)}
              colorPalette={palette}
            >
              <TagsInput.HiddenInput />
              <TagsInput.Control>
                <TagsInput.Items>
                  {tags.map((value, index) => (
                    <TagsInput.Item key={value} index={index} value={value}>
                      <TagsInput.ItemText>{value}</TagsInput.ItemText>
                      <TagsInput.ItemDeleteTrigger />
                    </TagsInput.Item>
                  ))}
                </TagsInput.Items>
                <TagsInput.Input placeholder="Add tag…" />
              </TagsInput.Control>
              <TagsInput.ClearTrigger>Clear</TagsInput.ClearTrigger>
            </TagsInput.Root>
            <Field.HelperText>
              Type and hit enter. Check chip bg/border + focus ring.
            </Field.HelperText>
          </Field.Root>
        </SubSection>
      </VStack>
    </Section>
  );
}
