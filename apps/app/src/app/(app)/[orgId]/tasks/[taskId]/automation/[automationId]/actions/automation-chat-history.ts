/** Discard malformed records and keep the first message for each saved ID. */
export function deduplicateChatHistory(messages: unknown[]): unknown[] {
  const seen = new Set<string>();
  return messages.filter((message) => {
    if (
      typeof message !== 'object' ||
      message === null ||
      !('id' in message) ||
      typeof message.id !== 'string' ||
      message.id.length === 0 ||
      seen.has(message.id)
    )
      return false;
    seen.add(message.id);
    return true;
  });
}
