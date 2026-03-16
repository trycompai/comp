'use client';

import { api } from '@/lib/api-client';
import {
  Button,
  Section,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Add, Edit } from '@trycompai/design-system/icons';
import { Input } from '@trycompai/ui/input';
import { Label } from '@trycompai/ui/label';
import { Textarea } from '@trycompai/ui/textarea';
import { useCallback, useEffect, useState } from 'react';

interface ContextEntry {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface ContextResponse {
  data: ContextEntry[];
  count: number;
}

export function ContextTab({ orgId }: { orgId: string }) {
  const [entries, setEntries] = useState<ContextEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<ContextEntry | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchContext = useCallback(async () => {
    setLoading(true);
    const res = await api.get<ContextResponse>(
      `/v1/admin/organizations/${orgId}/context`,
    );
    if (res.data) setEntries(res.data.data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    void fetchContext();
  }, [fetchContext]);

  const handleSaved = () => {
    setEditingEntry(null);
    setShowCreateForm(false);
    void fetchContext();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading context...
      </div>
    );
  }

  return (
    <>
      <Section
        title={`Context (${entries.length})`}
        actions={
          <Button
            size="sm"
            iconLeft={<Add size={16} />}
            onClick={() => setShowCreateForm(true)}
          >
            Add Context
          </Button>
        }
      >
        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            No context entries for this organization.
          </div>
        ) : (
          <Table variant="bordered">
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Answer</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...entries].sort((a, b) => a.question.localeCompare(b.question)).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="max-w-[400px] truncate">
                      <Text size="sm" weight="medium">
                        {entry.question}
                      </Text>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[400px] truncate">
                      <Text size="sm" variant="muted">
                        {entry.answer}
                      </Text>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      iconLeft={<Edit size={16} />}
                      onClick={() => setEditingEntry(entry)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Sheet
        open={showCreateForm || !!editingEntry}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateForm(false);
            setEditingEntry(null);
          }
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingEntry ? 'Edit Context' : 'Add Context'}
            </SheetTitle>
          </SheetHeader>
          <SheetBody>
            <ContextForm
              orgId={orgId}
              entry={editingEntry}
              onSaved={handleSaved}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}

function ContextForm({
  orgId,
  entry,
  onSaved,
}: {
  orgId: string;
  entry: ContextEntry | null;
  onSaved: () => void;
}) {
  const [question, setQuestion] = useState(entry?.question ?? '');
  const [answer, setAnswer] = useState(entry?.answer ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;

    setSubmitting(true);
    setError(null);

    const body = { question, answer };

    const res = entry
      ? await api.patch(
          `/v1/admin/organizations/${orgId}/context/${entry.id}`,
          body,
        )
      : await api.post(`/v1/admin/organizations/${orgId}/context`, body);

    if (res.error) {
      setError(res.error);
    } else {
      onSaved();
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <div>
          <Label htmlFor="ctx-question">Question</Label>
          <Input
            id="ctx-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What is the question?"
          />
        </div>
        <div>
          <Label htmlFor="ctx-answer">Answer</Label>
          <Textarea
            id="ctx-answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Provide the answer..."
            rows={6}
          />
        </div>
        {error && (
          <Text size="sm" variant="destructive">
            {error}
          </Text>
        )}
        <Button
          type="submit"
          loading={submitting}
          disabled={!question.trim() || !answer.trim()}
        >
          {entry ? 'Save Changes' : 'Create'}
        </Button>
      </Stack>
    </form>
  );
}
