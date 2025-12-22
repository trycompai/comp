/**
 * Extract mentioned user IDs from TipTap JSON content
 */
export function extractMentionedUserIds(description: string | null): string[] {
  if (!description) return [];

  try {
    const parsed = typeof description === 'string' ? JSON.parse(description) : description;
    
    if (!parsed || typeof parsed !== 'object') return [];

    const mentionedUserIds: string[] = [];

    // Recursively traverse the TipTap JSON structure
    function traverse(node: any) {
      if (!node || typeof node !== 'object') return;

      // Check if this is a mention node
      if (node.type === 'mention' && node.attrs?.id) {
        mentionedUserIds.push(node.attrs.id);
      }

      // Traverse content array
      if (Array.isArray(node.content)) {
        node.content.forEach(traverse);
      }
    }

    traverse(parsed);

    // Return unique user IDs
    return [...new Set(mentionedUserIds)];
  } catch (error) {
    // If parsing fails, return empty array
    return [];
  }
}

