'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface SuggestionFeedbackInputProps {
  editingRangeId: string | null;
  onSubmit: (id: string, feedback: string) => void;
  onCancel: () => void;
}

/**
 * Inline feedback input that appears when a user clicks "Edit" on a suggestion.
 * Renders as a normal React component — no DOM manipulation or portals.
 */
export function SuggestionFeedbackInput({
  editingRangeId,
  onSubmit,
  onCancel,
}: SuggestionFeedbackInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset and focus when editing a new range
  useEffect(() => {
    setValue('');
    if (editingRangeId) {
      // Small delay to let the DOM settle before focusing
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [editingRangeId]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && editingRangeId) {
      onSubmit(editingRangeId, trimmed);
    }
  }, [value, editingRangeId, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [handleSubmit, onCancel],
  );

  if (!editingRangeId) return null;

  return (
    <div className="suggestion-feedback-bar">
      <input
        ref={inputRef}
        type="text"
        className="suggestion-feedback-input"
        placeholder="How should this section be changed?"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className="suggestion-action-btn suggestion-action-feedback"
        onClick={handleSubmit}
        disabled={!value.trim()}
      >
        Send
      </button>
      <button
        type="button"
        className="suggestion-action-btn"
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  );
}
