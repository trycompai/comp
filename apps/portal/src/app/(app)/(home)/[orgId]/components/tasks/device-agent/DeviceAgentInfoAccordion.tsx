'use client';

import { Accordion, Text, VStack } from '@trycompai/ui-v2';
import { useState } from 'react';

export function DeviceAgentInfoAccordion() {
  const [value, setValue] = useState<string[]>([]);

  return (
    <Accordion.Root
      multiple={false}
      collapsible
      value={value}
      onValueChange={({ value: nextValue }) => setValue(nextValue)}
    >
      <Accordion.Item value="system-requirements">
        <Accordion.ItemTrigger>
          <Text textStyle="md" flex="1" textAlign="start">
            System Requirements
          </Text>
          <Accordion.ItemIndicator />
        </Accordion.ItemTrigger>
        <Accordion.ItemContent>
          <Accordion.ItemBody>
            <VStack align="stretch" gap="2">
              <Text fontSize="sm" color="fg.muted">
                <Text as="span" fontWeight="semibold" color="fg">
                  Operating Systems:
                </Text>{' '}
                macOS 14+, Windows 10+
              </Text>
              <Text fontSize="sm" color="fg.muted">
                <Text as="span" fontWeight="semibold" color="fg">
                  Memory:
                </Text>{' '}
                512MB RAM minimum
              </Text>
              <Text fontSize="sm" color="fg.muted">
                <Text as="span" fontWeight="semibold" color="fg">
                  Storage:
                </Text>{' '}
                200MB available disk space
              </Text>
            </VStack>
          </Accordion.ItemBody>
        </Accordion.ItemContent>
      </Accordion.Item>

      <Accordion.Item value="about">
        <Accordion.ItemTrigger>
          <Text textStyle="md" flex="1" textAlign="start">
            About Comp AI Device Monitor
          </Text>
          <Accordion.ItemIndicator />
        </Accordion.ItemTrigger>
        <Accordion.ItemContent>
          <Accordion.ItemBody>
            <VStack align="stretch" gap="2">
              <Text fontSize="sm" color="fg.muted">
                Comp AI Device Monitor is a lightweight agent that helps ensure your device meets
                security compliance requirements.
              </Text>
              <Text fontSize="sm" color="fg.muted">
                It monitors device configuration, installed software, and security settings to help
                maintain a secure work environment.
              </Text>
              <Text fontSize="sm" color="fg.muted">
                <Text as="span" fontWeight="semibold" color="fg">
                  Security powered by Comp AI:
                </Text>{' '}
                Your organization uses Comp AI to maintain security and compliance standards.
              </Text>
              <Text fontSize="xs" color="fg.muted">
                If you have questions, contact your IT administrator.
              </Text>
            </VStack>
          </Accordion.ItemBody>
        </Accordion.ItemContent>
      </Accordion.Item>
    </Accordion.Root>
  );
}
