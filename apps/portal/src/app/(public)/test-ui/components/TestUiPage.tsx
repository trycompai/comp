'use client';

import { Box, ColorModeButton, Container, Flex, Heading, Text } from '@trycompai/ui-new';
import { TestUiSectionsBottom } from './TestUiSectionsBottom';
import { TestUiSectionsTop } from './TestUiSectionsTop';

export function TestUiPage() {
  return (
    <Box pb="20">
      <Container maxW="1400px" py={8}>
        <Heading size="2xl" mb={2}>
          Design System Preview
        </Heading>
        <Text color="secondary.700" mb={8}>
          Theme palettes + components
        </Text>

        <TestUiSectionsTop />
        <TestUiSectionsBottom />
      </Container>

      <Box
        position="fixed"
        bottom="0"
        left="0"
        right="0"
        borderTopWidth="1px"
        borderTopColor="border"
        bg="white"
        zIndex="overlay"
      >
        <Container maxW="1400px" py="3">
          <Flex align="center" justify="space-between" gap="3">
            <Text color="secondary.700" fontSize="sm">
              Theme
            </Text>
            <ColorModeButton />
          </Flex>
        </Container>
      </Box>
    </Box>
  );
}
