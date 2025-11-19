/**
 * Universal utility function to deduplicate sources for questionnaire answers.
 * 
 * Deduplication rules:
 * - Policies: Same policy name = same source (deduplicated by policyName)
 * - Context: All context entries = single "Context Q&A" source
 * - Manual Answers: All manual answers = single "Manual Answer" source
 * - Other sources: Deduplicated by sourceId
 */

export interface Source {
  sourceType: string;
  sourceName?: string;
  sourceId?: string;
  policyName?: string;
  score: number;
}

/**
 * Deduplicates an array of sources based on source type and content.
 * For each source type, uses appropriate deduplication key:
 * - Policies: policyName
 * - Context: "Context Q&A" (all grouped together)
 * - Manual Answers: "Manual Answer" (all grouped together)
 * - Others: sourceId
 * 
 * When duplicates are found, keeps the one with the highest score.
 */
export function deduplicateSources(sources: Source[]): Source[] {
  const sourceMap = new Map<string, Source>();

  for (const source of sources) {
    let deduplicationKey: string;

    // Determine deduplication key based on source type
    if (source.sourceType === 'policy' && source.policyName) {
      // Policies: deduplicate by policy name
      deduplicationKey = `policy:${source.policyName}`;
    } else if (source.sourceType === 'context') {
      // Context: all context entries are grouped as one source
      deduplicationKey = 'context:all';
    } else if (source.sourceType === 'manual_answer') {
      // Manual Answers: all manual answers are grouped as one source
      deduplicationKey = 'manual_answer:all';
    } else {
      // Other sources: deduplicate by sourceId
      deduplicationKey = source.sourceId || `unknown:${source.sourceType}`;
    }

    // If we haven't seen this source, or this chunk has a higher score, use it
    const existing = sourceMap.get(deduplicationKey);
    if (!existing || source.score > existing.score) {
      // Create a normalized source with appropriate sourceName
      const normalizedSource: Source = {
        ...source,
        sourceName: getSourceDisplayName(source),
      };
      sourceMap.set(deduplicationKey, normalizedSource);
    }
  }

  // Convert map to array and sort by score (highest first)
  return Array.from(sourceMap.values()).sort((a, b) => b.score - a.score);
}

/**
 * Generates a display name for a source based on its type and properties.
 */
function getSourceDisplayName(source: Source): string {
  if (source.sourceType === 'policy' && source.policyName) {
    return `Policy: ${source.policyName}`;
  }
  
  if (source.sourceType === 'context') {
    return 'Context Q&A';
  }
  
  if (source.sourceType === 'manual_answer') {
    return 'Manual Answer';
  }
  
  if (source.sourceName) {
    return source.sourceName;
  }
  
  return source.sourceType || 'Unknown Source';
}

