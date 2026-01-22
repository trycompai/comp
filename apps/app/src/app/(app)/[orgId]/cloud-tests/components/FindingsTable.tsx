'use client';

import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@comp/ui/table';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

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
  medium: 'warning',
  low: 'default',
  info: 'secondary',
} as const;

const statusVariant = {
  failed: 'destructive',
  passed: 'success',
  new: 'warning',
  active: 'warning',
  open: 'destructive',
  success: 'success',
  resolved: 'default',
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
    <div className="rounded-xs border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead className="w-[120px]">Severity</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead className="w-[180px]">Detected At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {findings.map((finding) => {
            const isExpanded = expandedRows.has(finding.id);
            const severityKey = finding.severity?.toLowerCase() as keyof typeof severityVariant;
            const statusKey = finding.status?.toLowerCase() as keyof typeof statusVariant;

            return (
              <>
                <TableRow
                  key={finding.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleRow(finding.id)}
                >
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={severityVariant[severityKey] || 'default'}>
                      {finding.severity || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {finding.title || 'Untitled Finding'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[statusKey] || 'secondary'}>
                      {finding.status === 'success' ? 'Passed' : finding.status || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {finding.completedAt ? new Date(finding.completedAt).toLocaleString() : 'Never'}
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow key={`${finding.id}-details`}>
                    <TableCell colSpan={5} className="bg-muted/30">
                      <div className="space-y-4 p-4">
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
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
