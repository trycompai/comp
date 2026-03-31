'use client';

import { StatusIndicator } from '@/components/status-indicator';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@trycompai/design-system';
import { Search } from '@trycompai/design-system/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

export interface DocumentTypeWithStatus {
  formType: string;
  title: string;
  category: string;
  lastSubmittedAt: string | null;
  isCurrent: boolean;
}

interface DocumentsTableProps {
  documents: DocumentTypeWithStatus[];
  orgId: string;
}

export function DocumentsTable({ documents, orgId }: DocumentsTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) return documents;

    const searchLower = searchTerm.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(searchLower) ||
        doc.category.toLowerCase().includes(searchLower),
    );
  }, [documents, searchTerm]);

  const handleRowClick = (formType: string) => {
    router.push(`/${orgId}/documents/${formType}`);
  };

  return (
    <div className="space-y-4">
      <div className="w-full max-w-sm">
        <InputGroup>
          <InputGroupAddon>
            <Search size={16} />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </div>

      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Last Submitted</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredDocuments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>
                <Text size="sm" variant="muted">
                  No documents linked.
                </Text>
              </TableCell>
            </TableRow>
          ) : (
            filteredDocuments.map((doc) => (
              <TableRow
                key={doc.formType}
                role="button"
                tabIndex={0}
                onClick={() => handleRowClick(doc.formType)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleRowClick(doc.formType);
                  }
                }}
              >
                <TableCell>{doc.title}</TableCell>
                <TableCell>{doc.category}</TableCell>
                <TableCell>
                  {doc.lastSubmittedAt
                    ? new Date(doc.lastSubmittedAt).toLocaleDateString()
                    : 'Never'}
                </TableCell>
                <TableCell>
                  <StatusIndicator
                    status={doc.isCurrent ? 'completed' : 'not_started'}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
