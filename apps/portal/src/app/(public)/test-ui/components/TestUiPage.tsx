'use client';

import {
  Box,
  ColorModeButton,
  Container,
  Flex,
  Heading,
  type SupportedColorPalette,
} from '@trycompai/ui-new';
import { useState } from 'react';
import { ButtonPaletteSwitcher } from './ButtonPaletteSwitcher';
import { TestUiSectionsBottom } from './TestUiSectionsBottom';
import { TestUiSectionsTop } from './TestUiSectionsTop';

export function TestUiPage() {
  const [palette, setPalette] = useState<SupportedColorPalette>('primary');

  return (
    <Box pb="12">
      <Box
        position="sticky"
        top="0"
        zIndex="sticky"
        bg="bg"
        borderBottomWidth="1px"
        borderBottomColor="border"
      >
        <Container maxW="1400px" py="4">
          <Flex
            align={{ base: 'stretch', md: 'center' }}
            justify="space-between"
            direction={{ base: 'column', md: 'row' }}
            gap="4"
          >
            <Heading size="xl">Design System Preview</Heading>
            <Flex align="center" justify="space-between" gap="4" flexWrap="wrap">
              <ButtonPaletteSwitcher value={palette} onChange={setPalette} />
              <ColorModeButton />
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Container maxW="1400px" py={8}>
        <TestUiSectionsTop palette={palette} />
        <TestUiSectionsBottom palette={palette} />
      </Container>
    </Box>
  );
}
