import { describe, expect, it } from 'vitest';
import { deduplicateChatHistory } from './automation-chat-history';

describe('saved automation chat history', () => {
  it('keeps the first occurrence of each ID in its original order', () => {
    const first = { id: 'msg_1', parts: [{ type: 'text', text: 'first' }] };
    const second = { id: 'msg_2', parts: [] };
    expect(deduplicateChatHistory([first, second, { ...first, parts: [] }])).toEqual([
      first,
      second,
    ]);
  });
  it('discards missing, empty and non-string IDs without collapsing valid records', () => {
    const valid = { id: 'msg_1', role: 'assistant', parts: [] };
    expect(
      deduplicateChatHistory([null, undefined, 'text', 7, {}, { id: 1 }, { id: '' }, valid]),
    ).toEqual([valid]);
  });
});
