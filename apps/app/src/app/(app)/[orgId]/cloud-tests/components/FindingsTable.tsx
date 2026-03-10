'use client';

import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@trycompai/design-system';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Fragment, useState } from 'react';

interface Finding {
  id: string;
  title: string | null;
  description: string | null;
  remediation: string | null;
  status: string | null;
  severity: string | null;
  completedAt: Date | null;
}

interface FindingsTableProps {
  findings: Finding[];
}

const severityVariant = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'secondary',
  low: 'default',
  info: 'outline',
} as const;

const statusVariant = {
  failed: 'destructive',
  passed: 'default',
  new: 'secondary',
  active: 'secondary',
  open: 'destructive',
  success: 'default',
  resolved: 'outline',
} as const;

export function FindingsTable({ findings }: FindingsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (findings.length === 0) {
    return (
      <div className="rounded-xs border p-12 text-center">
        <p className="text-muted-foreground text-lg">No findings available</p>
      </div>
    );
  }

  return (
    <Table variant="bordered">
      <TableHeader>
        <TableRow>
          <TableHead></TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Detected At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {findings.map((finding) => {
          const isExpanded = expandedRows.has(finding.id);
          const severityKey = finding.severity?.toLowerCase() as keyof typeof severityVariant;
          const statusKey = finding.status?.toLowerCase() as keyof typeof statusVariant;

          return (
            <Fragment key={finding.id}>
              <TableRow onClick={() => toggleRow(finding.id)}>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    iconLeft={isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  />
                </TableCell>
                <TableCell>
                  <Badge variant={severityVariant[severityKey] || 'default'}>
                    {finding.severity || 'Unknown'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-medium">
                    {finding.title || 'Untitled Finding'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[statusKey] || 'secondary'}>
                    {finding.status === 'success' ? 'Passed' : finding.status || 'Unknown'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground text-sm">
                    {finding.completedAt ? new Date(finding.completedAt).toLocaleString() : 'Never'}
                  </span>
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow key={`${finding.id}-details`}>
                  <TableCell colSpan={5}>
                    <div className="space-y-4 bg-muted/30 p-4">
                      {finding.description && (
                        <div>
                          <h4 className="mb-2 font-semibold">Description</h4>
                          <p className="text-muted-foreground text-sm">{finding.description}</p>
                        </div>
                      )}
                      {finding.remediation && (
                        <div>
                          <h4 className="mb-2 font-semibold">Remediation</h4>
                          <div className="text-muted-foreground text-sm">
                            {finding.remediation.split(/\b(https?:\/\/\S+)\b/).map((part, i) => {
                              return /^https?:\/\/\S+$/.test(part) ? (
                                <a
                                  key={i}
                                  href={part}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {part}
                                </a>
                              ) : (
                                <span key={i}>{part}</span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
