import { Diff, Hunk } from './diff';

import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
} from './collapsible-card';

import { parseDiff, type ParseOptions } from './diff/utils/parse';

export function DiffViewer({
  patch,
  options = {},
}: {
  patch: string;
  options?: Partial<ParseOptions>;
}) {
  const [file] = parseDiff(patch, options);
  if (!file) return null;

  return (
    <CollapsibleCard
      data-section-id="diff-viewer"
      id="diff-viewer"
      className="my-4 text-[0.8rem] w-full"
      title="File Changes"
      defaultOpen
    >
      <CollapsibleCardHeader>
        <CollapsibleCardTitle title={file.newPath}>{file.newPath}</CollapsibleCardTitle>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <Diff fileName="file-changes.tsx" hunks={file.hunks} type={file.type}>
          {file.hunks.map((hunk) => (
            <Hunk key={hunk.content} hunk={hunk} />
          ))}
        </Diff>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
