'use client';

import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import type { IsmsAcceptanceState } from '../isms-types';

/** The columns shared by the organisational and supplier risk tables. */
export interface RiskTreatmentTableRow {
  /** First cell: risk reference (R-01) or vendor name. */
  key: string;
  title: string;
  category: string;
  inherentLevel: string;
  treatment: string;
  controls: string;
  ownerName: string;
  residualLevel: string;
  acceptance: string;
  acceptanceState: IsmsAcceptanceState;
  status: string;
}

const ACCEPTANCE_BADGE: Record<
  IsmsAcceptanceState,
  { variant: 'accent' | 'secondary' | 'destructive'; label: string }
> = {
  accepted: { variant: 'accent', label: 'Accepted' },
  awaiting: { variant: 'secondary', label: 'Awaiting acceptance' },
  stale: { variant: 'destructive', label: 'Stale' },
};

interface RiskTreatmentTableProps {
  /** Header of the first column ("Ref" for risks, "Vendor" for suppliers). */
  keyHeader: string;
  /** Hide the description column for vendors (the key cell is the name). */
  showTitle: boolean;
  rows: RiskTreatmentTableRow[];
  emptyText: string;
}

export function RiskTreatmentTable({
  keyHeader,
  showTitle,
  rows,
  emptyText,
}: RiskTreatmentTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border py-8 text-center">
        <Text variant="muted">{emptyText}</Text>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{keyHeader}</TableHead>
            {showTitle && <TableHead>Description</TableHead>}
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Inherent</TableHead>
            <TableHead>Treatment</TableHead>
            <TableHead>Controls / actions</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Residual</TableHead>
            <TableHead>Acceptance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const badge = ACCEPTANCE_BADGE[row.acceptanceState];
            return (
              <TableRow key={row.key}>
                <TableCell>
                  <span className="font-medium">{row.key}</span>
                </TableCell>
                {showTitle && (
                  <TableCell>
                    <span className="block min-w-40 whitespace-normal">{row.title}</span>
                  </TableCell>
                )}
                <TableCell>{row.category}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{row.inherentLevel}</TableCell>
                <TableCell>{row.treatment}</TableCell>
                <TableCell>
                  <span className="block min-w-48 max-w-md whitespace-normal">
                    {row.controls}
                  </span>
                </TableCell>
                <TableCell>{row.ownerName}</TableCell>
                <TableCell>{row.residualLevel}</TableCell>
                <TableCell>
                  <span className="flex min-w-40 flex-col items-start gap-1">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    {row.acceptanceState !== 'awaiting' && (
                      <span className="whitespace-normal text-xs text-muted-foreground">
                        {row.acceptance}
                      </span>
                    )}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
