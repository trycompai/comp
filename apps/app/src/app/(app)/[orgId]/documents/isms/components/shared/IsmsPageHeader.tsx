import { HStack, Heading, Stack, Text } from '@trycompai/design-system';
import { ArrowLeft } from '@trycompai/design-system/icons';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { IsmsDocumentStatus } from '../../isms-types';
import { IsmsStatusBadge } from './IsmsStatusBadge';

export interface IsmsPageHeaderProps {
  /** ISO 27001 clause reference rendered before the title, e.g. "4.1". */
  clause: string;
  /** Document title (without the clause prefix). */
  title: string;
  /** One- or two-line context blurb under the title. */
  description?: string;
  /** Current document status; renders the shared status badge inline. */
  status?: IsmsDocumentStatus | null;
  /** Show the "Needs review" drift indicator next to the status. */
  isStale?: boolean;
  /** Back link to the ISMS overview. */
  backHref?: string;
  /** Export / generate buttons. */
  actions?: ReactNode;
}

/**
 * The consistent detail-page header for every ISMS foundational document.
 * Pairs a clause-prefixed title with the shared status badge and an actions
 * slot (typically Export PDF / DOCX). Built on DS primitives only.
 */
export function IsmsPageHeader({
  clause,
  title,
  description,
  status,
  isStale,
  backHref,
  actions,
}: IsmsPageHeaderProps) {
  return (
    <Stack gap="2">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          <ArrowLeft size={16} />
          <span>ISMS</span>
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <Stack gap="2">
          <HStack gap="3" align="center" wrap="wrap">
            <Heading level="1">{`${clause} ${title}`}</Heading>
            {status !== undefined && <IsmsStatusBadge status={status} isStale={isStale} />}
          </HStack>
          {description && (
            <div className="max-w-2xl">
              <Text size="sm" variant="muted">
                {description}
              </Text>
            </div>
          )}
        </Stack>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </Stack>
  );
}
