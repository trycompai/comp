'use client';

import { useApi } from '@/hooks/use-api';
import { Button } from '@comp/ui/button';
import { Input } from '@comp/ui/input';
import { Textarea } from '@comp/ui/textarea';
import { Card } from '@comp/ui/card';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronUp, ChevronDown, Save, Loader2 } from 'lucide-react';
import type { FaqItem } from '../types/faq';

const normalizeFaqs = (items: FaqItem[]): FaqItem[] => {
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((faq, index) => ({ ...faq, order: index }));
};

const createTempFaqId = (): string => {
  // Use a collision-safe id for React keys/state updates.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `temp-${crypto.randomUUID()}`;
  }

  return `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function TrustPortalFaqBuilder({
  initialFaqs,
  orgId,
}: {
  initialFaqs: FaqItem[] | null;
  orgId: string;
}) {
  const { put } = useApi();
  const [faqs, setFaqs] = useState<FaqItem[]>(() =>
    normalizeFaqs(initialFaqs ?? []),
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddFaq = useCallback(() => {
    setFaqs((prev) => {
      const normalized = normalizeFaqs(prev);
      const newFaq: FaqItem = {
        id: createTempFaqId(),
        question: '',
        answer: '',
        order: normalized.length,
      };
      return [...normalized, newFaq];
    });
    setIsDirty(true);
  }, []);

  const handleUpdateFaq = useCallback(
    (id: string, field: 'question' | 'answer', value: string) => {
      setFaqs((prev) =>
        prev.map((faq) => (faq.id === id ? { ...faq, [field]: value } : faq)),
      );
      setIsDirty(true);
    },
    [],
  );

  const handleDeleteFaq = useCallback(
    (id: string) => {
      setFaqs((prev) =>
        prev
          .filter((faq) => faq.id !== id)
          .map((faq, index) => ({ ...faq, order: index })),
      );
      setIsDirty(true);
    },
    [],
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      setFaqs((prev) => {
        const updated = [...prev];
        [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
        return updated.map((faq, i) => ({ ...faq, order: i }));
      });
      setIsDirty(true);
    },
    [],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      let didMove = false;

      setFaqs((prev) => {
        if (index === prev.length - 1) return prev;
        didMove = true;
        const updated = [...prev];
        [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
        return updated.map((faq, i) => ({ ...faq, order: i }));
      });

      // Only mark dirty if something actually changed.
      if (didMove) {
        setIsDirty(true);
      }
    },
    [],
  );

  const handleSave = useCallback(async () => {
    // Filter out FAQs where both question and answer are empty (draft FAQs)
    const validFaqs = faqs.filter((faq) => faq.question.trim() !== '' || faq.answer.trim() !== '');

    // Check if any FAQ has only question or only answer (incomplete)
    const incompleteFaqs = validFaqs.filter(
      (faq) =>
        (faq.question.trim() === '' && faq.answer.trim() !== '') ||
        (faq.question.trim() !== '' && faq.answer.trim() === ''),
    );

    if (incompleteFaqs.length > 0) {
      toast.error('Please fill both question and answer for all FAQs');
      return;
    }

    // Normalize order values to prevent gaps/duplicates (e.g., [0, 2] -> [0, 1])
    const normalized = validFaqs.map((faq, index) => ({ ...faq, order: index }));

    // Also normalize local state (remove empty drafts + keep UI consistent)
    setFaqs(normalized);

    setIsSaving(true);
    try {
      const response = await put('/v1/trust-portal/settings/faqs', { faqs: normalized });
      if (response.error) throw new Error(response.error);
      setIsDirty(false);
      toast.success('FAQs saved successfully');
    } catch {
      toast.error('Failed to save FAQs');
    } finally {
      setIsSaving(false);
    }
  }, [faqs, put]);

  return (
    <div className="space-y-4">
      {/* Header with Add and Save buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Frequently Asked Questions</h3>
          {faqs.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({faqs.length})
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={handleAddFaq}
            variant="default"
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add FAQ
          </Button>
          {isDirty && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Unsaved changes
            </span>
          )}
          <Button
            type="button"
            size="sm"
            variant={isDirty ? 'default' : 'outline'}
            disabled={!isDirty || isSaving}
            onClick={handleSave}
            className="gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* FAQ List */}
      <div className="space-y-3">
        {faqs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No FAQs yet. Click "Add FAQ" to get started.
          </p>
        ) : (
          faqs.map((faq, index) => (
            <Card key={faq.id} className="p-4">
              <div className="flex gap-3">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                    title="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === faqs.length - 1}
                    onClick={() => handleMoveDown(index)}
                    title="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* FAQ Content */}
                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Question {index + 1}
                    </label>
                    <Input
                      value={faq.question}
                      onChange={(e) => handleUpdateFaq(faq.id, 'question', e.target.value)}
                      placeholder="What is your security policy?"
                      className={`font-medium placeholder:text-muted-foreground/70 ${
                        faq.question.trim() === '' && faq.answer.trim() !== ''
                          ? 'border-destructive'
                          : ''
                      }`}
                    />
                    {faq.question.trim() === '' && faq.answer.trim() !== '' && (
                      <p className="text-xs text-destructive">Question is required</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Answer
                    </label>
                    <Textarea
                      value={faq.answer}
                      onChange={(e) => handleUpdateFaq(faq.id, 'answer', e.target.value)}
                      placeholder="We follow industry best practices..."
                      className={`min-h-[100px] placeholder:text-muted-foreground/70 ${
                        faq.answer.trim() === '' && faq.question.trim() !== ''
                          ? 'border-destructive'
                          : ''
                      }`}
                    />
                    {faq.answer.trim() === '' && faq.question.trim() !== '' && (
                      <p className="text-xs text-destructive">Answer is required</p>
                    )}
                  </div>
                </div>

                {/* Delete button */}
                <div className="pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteFaq(faq.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

    </div>
  );
}

