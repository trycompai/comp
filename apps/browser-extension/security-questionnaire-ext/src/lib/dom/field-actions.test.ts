import { describe, expect, it, vi } from 'vitest';
import { insertAnswerIntoField } from './field-actions';

describe('insertAnswerIntoField', () => {
  it('sets textarea value and dispatches edit events', () => {
    const textarea = document.createElement('textarea');
    const handleInput = vi.fn();
    const handleChange = vi.fn();
    textarea.addEventListener('input', handleInput);
    textarea.addEventListener('change', handleChange);

    insertAnswerIntoField({ field: textarea, answer: 'Yes, data is encrypted.' });

    expect(textarea.value).toBe('Yes, data is encrypted.');
    expect(handleInput).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('sets contenteditable text and dispatches edit events', () => {
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    const handleInput = vi.fn();
    editable.addEventListener('input', handleInput);

    insertAnswerIntoField({ field: editable, answer: 'Documented annually.' });

    expect(editable.textContent).toBe('Documented annually.');
    expect(handleInput).toHaveBeenCalledTimes(1);
  });
});
