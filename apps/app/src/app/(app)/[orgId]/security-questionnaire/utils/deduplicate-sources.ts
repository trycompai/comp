/**
 * Universal utility function to deduplicate sources for questionnaire answers.
 * 
 * Deduplication rules:
 * - Policies: Same policy name = same source (deduplicated by policyName)
 * - Context: All context entries = single "Context Q&A" source
 * - Manual Answers: Each manual answer is a separate source (deduplicated by sourceId)
 * - Knowledge Base Documents: Deduplicated by sourceId (each document is a separate source)
 * - Other sources: Deduplicated by sourceId
 */

export interface Source {
  sourceType: string;
  sourceName?: string;
  sourceId?: string;
  policyName?: string;
  documentName?: string;
  manualAnswerQuestion?: string;
  score: number;
}

/**
 * Deduplicates an array of sources based on source type and content.
 * For each source type, uses appropriate deduplication key:
 * - Policies: policyName
 * - Context: "Context Q&A" (all grouped together)
 * - Manual Answers: sourceId (each manual answer is separate)
 * - Knowledge Base Documents: sourceId (each document is separate)
 * - Others: sourceId
 * 
 * When duplicates are found, keeps the one with the highest score.
 */
export function deduplicateSources(sources: Source[]): Source[] {
  // Return empty array if no sources provided
  if (!sources || sources.length === 0) {
    return [];
  }

  const sourceMap = new Map<string, Source>();

  for (const source of sources) {
    // Skip sources without required fields
    if (!source.sourceType) {
      continue;
    }

    let deduplicationKey: string;

    // Determine deduplication key based on source type
    if (source.sourceType === 'policy' && source.policyName) {
      // Policies: deduplicate by policy name
      deduplicationKey = `policy:${source.policyName}`;
    } else if (source.sourceType === 'context') {
      // Context: all context entries are grouped as one source
      deduplicationKey = 'context:all';
    } else if (source.sourceType === 'manual_answer') {
      // Manual Answers: each manual answer is a separate source (like knowledge_base_document)
      // This prevents one manual answer from appearing as source for all questions
      // Use sourceId if available, otherwise fallback to unknown
      deduplicationKey = `manual_answer:${source.sourceId || 'unknown'}`;
    } else if (source.sourceType === 'knowledge_base_document') {
      // Knowledge Base Documents: deduplicate by sourceId (each document is separate)
      deduplicationKey = `knowledge_base_document:${source.sourceId || 'unknown'}`;
    } else {
      // Other sources: deduplicate by sourceId
      deduplicationKey = source.sourceId || `unknown:${source.sourceType}`;
    }

    // If we haven't seen this source, or this chunk has a higher score, use it
    const existing = sourceMap.get(deduplicationKey);
    if (!existing || source.score > existing.score) {
      // Create a normalized source with appropriate sourceName
      // Preserve documentName and manualAnswerQuestion if available (they might be missing in some chunks)
      // Always regenerate sourceName to ensure it uses the latest metadata (especially manualAnswerQuestion)
      const normalizedSource: Source = {
        ...source,
        documentName: source.documentName || existing?.documentName,
        manualAnswerQuestion: source.manualAnswerQuestion || existing?.manualAnswerQuestion,
        // Don't use source.sourceName - regenerate it to ensure it uses manualAnswerQuestion
        sourceName: undefined, // Will be set by getSourceDisplayName
      };
      normalizedSource.sourceName = getSourceDisplayName(normalizedSource);
      sourceMap.set(deduplicationKey, normalizedSource);
    } else if (existing) {
      // Update existing source if new one has missing metadata
      let needsUpdate = false;
      if (source.documentName && !existing.documentName) {
        existing.documentName = source.documentName;
        needsUpdate = true;
      }
      if (source.manualAnswerQuestion && !existing.manualAnswerQuestion) {
        existing.manualAnswerQuestion = source.manualAnswerQuestion;
        needsUpdate = true;
      }
      // Always regenerate sourceName to ensure it uses the latest metadata
      // Especially important for manual_answer to show the question preview
      if (needsUpdate || !existing.sourceName || existing.sourceType === 'manual_answer') {
        existing.sourceName = getSourceDisplayName(existing);
      }
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
    // Show question from manual answer if available for better identification
    // This helps distinguish between different manual answers
    if (source.manualAnswerQuestion) {
      const preview = source.manualAnswerQuestion.length > 50 
        ? source.manualAnswerQuestion.substring(0, 50) + '...'
        : source.manualAnswerQuestion;
      return `Manual Answer (${preview})`;
    }
    // Fallback: use sourceId if available to distinguish different manual answers
    if (source.sourceId) {
      const shortId = source.sourceId.length > 8 
        ? source.sourceId.substring(source.sourceId.length - 8)
        : source.sourceId;
      return `Manual Answer (${shortId})`;
    }
    return 'Manual Answer';
  }
  
  if (source.sourceType === 'knowledge_base_document') {
    // Show filename if available, otherwise just "Knowledge Base Document"
    if (source.documentName) {
      return `Knowledge Base Document (${source.documentName})`;
    }
    return 'Knowledge Base Document';
  }
  
  if (source.sourceName) {
    return source.sourceName;
  }
  
  return source.sourceType || 'Unknown Source';
}

