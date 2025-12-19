'use client';

import {
  Box,
  ColorModeButton,
  Container,
  Flex,
  Heading,
  type SupportedColorPalette,
} from '@trycompai/ui-v2';
import { useState } from 'react';
import { ButtonPaletteSwitcher } from './ButtonPaletteSwitcher';
import { TestUiSectionsBottom } from './TestUiSectionsBottom';
import { TestUiSectionsDataDisplay } from './TestUiSectionsDataDisplay';
import { TestUiSectionsDisclosure } from './TestUiSectionsDisclosure';
import { TestUiSectionsFeedback } from './TestUiSectionsFeedback';
import { TestUiSectionsFormsAdvanced } from './TestUiSectionsFormsAdvanced';
import { TestUiSectionsFormsBasic } from './TestUiSectionsFormsBasic';
import { TestUiSectionsFormsSelection } from './TestUiSectionsFormsSelection';
import { TestUiSectionsMedia } from './TestUiSectionsMedia';
import { TestUiSectionsNavigation } from './TestUiSectionsNavigation';
import { TestUiSectionsOverlays } from './TestUiSectionsOverlays';
import { TestUiSectionsTop } from './TestUiSectionsTop';
import { TestUiSectionsTypography } from './TestUiSectionsTypography';
import { TestUiSectionsUtilities } from './TestUiSectionsUtilities';

export function TestUiPage() {
  const [palette, setPalette] = useState<SupportedColorPalette>('primary');

  return (
    <div className="chakra-scope">
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
          <TestUiSectionsTypography />
          <TestUiSectionsMedia />
          <TestUiSectionsFormsBasic palette={palette} />
          <TestUiSectionsFormsSelection palette={palette} />
          <TestUiSectionsFormsAdvanced palette={palette} />
          <TestUiSectionsDataDisplay palette={palette} />
          <TestUiSectionsDisclosure palette={palette} />
          <TestUiSectionsOverlays palette={palette} />
          <TestUiSectionsNavigation palette={palette} />
          <TestUiSectionsFeedback palette={palette} />
          <TestUiSectionsUtilities palette={palette} />
          <TestUiSectionsBottom palette={palette} />
        </Container>
      </Box>
    </div>
  );
}
