'use client';

import {
  Badge,
  Button,
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
  Section,
  Spinner,
  Text,
} from '@trycompai/design-system';
import { Document, Download, Time } from '@trycompai/design-system/icons';
import { IsmsEmptyState } from './shared';
import type { IsmsExportFormat, IsmsPublishedVersion } from '../isms-types';

interface IsmsVersionHistoryProps {
  versions: IsmsPublishedVersion[];
  isLoading: boolean;
  error: unknown;
  /** Version id currently downloading, so its buttons can show a spinner. */
  downloadingVersionId: string | null;
  onDownload: (versionId: string, format: IsmsExportFormat) => void | Promise<void>;
}

/** Format an ISO timestamp as a short human date, or null when unparseable. */
function formatDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** One published version's "Published {date} by {name}" line, with changelog. */
function versionSubtitle(version: IsmsPublishedVersion): string {
  const date = formatDate(version.publishedAt);
  const published = date ? `Published ${date}` : 'Published';
  const by = version.publishedByName ? ` by ${version.publishedByName}` : '';
  const note = version.changelog ? ` — ${version.changelog}` : '';
  return `${published}${by}${note}`;
}

/**
 * Version history for an ISMS document (CS-701): a list of published versions,
 * newest first, each with its date, approver and per-version PDF/DOCX download.
 * Rendered once inside IsmsDocumentShell so all six documents inherit it. Data is
 * owned by the shell (useIsmsDocumentVersions) and passed in as props.
 */
export function IsmsVersionHistory({
  versions,
  isLoading,
  error,
  downloadingVersionId,
  onDownload,
}: IsmsVersionHistoryProps) {
  return (
    <Section
      title="Version history"
      description="Previously published versions. Download the exact document that was approved at each version."
    >
      {isLoading && versions.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : error && versions.length === 0 ? (
        <IsmsEmptyState
          compact
          icon={Time}
          title="Couldn't load version history"
          description="Something went wrong loading the published versions."
        />
      ) : versions.length === 0 ? (
        <IsmsEmptyState
          compact
          icon={Time}
          title="No published versions yet"
          description="Approve this document to publish its first version."
        />
      ) : (
        <ItemGroup>
          {versions.map((version) => (
            <Item key={version.id} variant="outline" size="sm">
              <ItemMedia variant="icon">
                <Time size={16} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>
                  {`v${version.version}`}
                  {version.isCurrent && <Badge variant="accent">Current</Badge>}
                </ItemTitle>
                <Text variant="muted" size="sm">
                  {versionSubtitle(version)}
                </Text>
              </ItemContent>
              <ItemActions>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={downloadingVersionId === version.id}
                  onClick={() => void onDownload(version.id, 'pdf')}
                  iconLeft={<Download size={16} />}
                >
                  PDF
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={downloadingVersionId === version.id}
                  onClick={() => void onDownload(version.id, 'docx')}
                  iconLeft={<Document size={16} />}
                >
                  DOCX
                </Button>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}
    </Section>
  );
}
