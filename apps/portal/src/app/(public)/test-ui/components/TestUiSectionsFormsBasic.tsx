'use client';

import {
  Button,
  CloseButton,
  Field,
  Fieldset,
  HStack,
  Input,
  NativeSelect,
  NumberInput,
  PinInput,
  Text,
  Textarea,
  VStack,
  type SupportedColorPalette,
} from '@trycompai/ui-v2';
import { useState } from 'react';
import { Section, SubSection } from './TestUiPrimitives';

export function TestUiSectionsFormsBasic({ palette }: { palette: SupportedColorPalette }) {
  const [pin, setPin] = useState<string[]>(['1', '2', '3', '4']);

  return (
    <Section title="Forms & Inputs">
      <VStack align="stretch" gap={8}>
        <SubSection title="Buttons">
          <HStack gap={3} flexWrap="wrap">
            <Button colorPalette={palette}>Primary action</Button>
            <Button colorPalette={palette} variant="outline">
              Secondary action
            </Button>
            <Button colorPalette={palette} variant="ghost">
              Ghost
            </Button>
            <Button colorPalette={palette} isLink>
              Link
            </Button>
            <CloseButton />
          </HStack>
        </SubSection>

        <SubSection title="Field + Input + Textarea">
          <Fieldset.Root>
            <Fieldset.Legend>Account</Fieldset.Legend>
            <Fieldset.Content>
              <Field.Root>
                <Field.Label>Email</Field.Label>
                <Input placeholder="you@company.com" />
                <Field.HelperText>We’ll never share this.</Field.HelperText>
              </Field.Root>

              <Field.Root invalid>
                <Field.Label>Bio</Field.Label>
                <Textarea placeholder="Short bio..." rows={3} />
                <Field.ErrorText>Something is off here.</Field.ErrorText>
              </Field.Root>
            </Fieldset.Content>
          </Fieldset.Root>
        </SubSection>

        <SubSection title="NativeSelect">
          <Field.Root>
            <Field.Label>Role</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field>
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            <Field.HelperText>Native select styling sanity check.</Field.HelperText>
          </Field.Root>
        </SubSection>

        <SubSection title="NumberInput">
          <HStack gap={6} flexWrap="wrap" align="flex-end">
            <Field.Root>
              <Field.Label>Seats</Field.Label>
              <NumberInput.Root defaultValue="3" min={1} max={999} colorPalette={palette}>
                <NumberInput.Control>
                  <NumberInput.Input />
                  <NumberInput.IncrementTrigger />
                  <NumberInput.DecrementTrigger />
                </NumberInput.Control>
              </NumberInput.Root>
            </Field.Root>

            <Text fontSize="sm" color="fg.muted">
              Check focus ring, disabled states, and stepper hit targets.
            </Text>
          </HStack>
        </SubSection>

        <SubSection title="PinInput">
          <PinInput.Root
            value={pin}
            onValueChange={(e) => setPin(e.value)}
            otp
            colorPalette={palette}
          >
            <PinInput.Label>Verification code</PinInput.Label>
            <PinInput.Control>
              <PinInput.Input index={0} />
              <PinInput.Input index={1} />
              <PinInput.Input index={2} />
              <PinInput.Input index={3} />
              <PinInput.HiddenInput />
            </PinInput.Control>
          </PinInput.Root>
        </SubSection>
      </VStack>
    </Section>
  );
}
