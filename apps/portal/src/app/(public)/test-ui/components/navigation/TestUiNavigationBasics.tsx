'use client';

import {
  Breadcrumb,
  Button,
  HStack,
  Pagination,
  SkipNavContent,
  SkipNavLink,
  Text,
  type SupportedColorPalette,
} from '@trycompai/ui-v2';
import { SubSection } from '../TestUiPrimitives';

export function TestUiNavigationBasics({ palette }: { palette: SupportedColorPalette }) {
  return (
    <>
      <SubSection title="SkipNav">
        <SkipNavLink>Skip to content</SkipNavLink>
        <Text fontSize="sm" color="fg.muted">
          Tab once to reveal the skip link.
        </Text>
        <SkipNavContent id="test-ui-skipnav-content" />
      </SubSection>

      <SubSection title="Breadcrumb">
        <Breadcrumb.Root>
          <Breadcrumb.List>
            <Breadcrumb.Item>
              <Breadcrumb.Link href="#">Home</Breadcrumb.Link>
            </Breadcrumb.Item>
            <Breadcrumb.Separator />
            <Breadcrumb.Item>
              <Breadcrumb.Link href="#">Vendors</Breadcrumb.Link>
            </Breadcrumb.Item>
            <Breadcrumb.Separator />
            <Breadcrumb.Item>
              <Breadcrumb.CurrentLink>Acme</Breadcrumb.CurrentLink>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb.Root>
      </SubSection>

      <SubSection title="Pagination">
        <Pagination.Root count={120} pageSize={10}>
          <HStack gap="2" flexWrap="wrap" align="center">
            <Pagination.PrevTrigger asChild>
              <Button size="sm" variant="outline" colorPalette={palette}>
                Prev
              </Button>
            </Pagination.PrevTrigger>

            <Pagination.Items
              render={(page) => (
                <Pagination.Item {...page}>
                  <Button size="sm" variant="ghost" colorPalette={palette}>
                    {page.value}
                  </Button>
                </Pagination.Item>
              )}
              ellipsis={<Pagination.Ellipsis index={0}>…</Pagination.Ellipsis>}
            />

            <Pagination.NextTrigger asChild>
              <Button size="sm" variant="outline" colorPalette={palette}>
                Next
              </Button>
            </Pagination.NextTrigger>

            <Pagination.PageText format="short" />
          </HStack>
        </Pagination.Root>
      </SubSection>
    </>
  );
}
