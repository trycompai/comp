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
 * Mirrored from the Next.js implementation so Trigger/Nest tasks can reuse it.
 *
 * - Policies: policyName
 * - Context: grouped into single "Context Q&A"
 * - Manual Answers: sourceId (each answer is separate)
 * - Knowledge Base Documents: sourceId
 * - Others: sourceId
 *
 * Keeps the highest score when duplicates appear.
 */
export function deduplicateSources(sources: Source[]): Source[] {
  if (!sources || sources.length === 0) {
    return [];
  }

  const sourceMap = new Map<string, Source>();

  for (const source of sources) {
    if (!source.sourceType) {
      continue;
    }

    let deduplicationKey: string;

    if (source.sourceType === 'policy' && source.policyName) {
      deduplicationKey = `policy:${source.policyName}`;
    } else if (source.sourceType === 'context') {
      deduplicationKey = 'context:all';
    } else if (source.sourceType === 'manual_answer') {
      deduplicationKey = `manual_answer:${source.sourceId || 'unknown'}`;
    } else if (source.sourceType === 'knowledge_base_document') {
      deduplicationKey = `knowledge_base_document:${source.sourceId || 'unknown'}`;
    } else {
      deduplicationKey = source.sourceId || `unknown:${source.sourceType}`;
    }

    const existing = sourceMap.get(deduplicationKey);
    if (!existing || source.score > existing.score) {
      const normalizedSource: Source = {
        ...source,
        documentName: source.documentName || existing?.documentName,
        manualAnswerQuestion:
          source.manualAnswerQuestion || existing?.manualAnswerQuestion,
        sourceName: undefined,
      };
      normalizedSource.sourceName = getSourceDisplayName(normalizedSource);
      sourceMap.set(deduplicationKey, normalizedSource);
    } else if (existing) {
      let needsUpdate = false;
      if (source.documentName && !existing.documentName) {
        existing.documentName = source.documentName;
        needsUpdate = true;
      }
      if (source.manualAnswerQuestion && !existing.manualAnswerQuestion) {
        existing.manualAnswerQuestion = source.manualAnswerQuestion;
        needsUpdate = true;
      }
      if (
        needsUpdate ||
        !existing.sourceName ||
        existing.sourceType === 'manual_answer'
      ) {
        existing.sourceName = getSourceDisplayName(existing);
      }
    }
  }

  return Array.from(sourceMap.values()).sort((a, b) => b.score - a.score);
}

function getSourceDisplayName(source: Source): string {
  if (source.sourceType === 'policy' && source.policyName) {
    return `Policy: ${source.policyName}`;
  }

  if (source.sourceType === 'context') {
    return 'Context Q&A';
  }

  if (source.sourceType === 'manual_answer') {
    if (source.manualAnswerQuestion) {
      const preview =
        source.manualAnswerQuestion.length > 50
          ? `${source.manualAnswerQuestion.substring(0, 50)}...`
          : source.manualAnswerQuestion;
      return `Manual Answer (${preview})`;
    }
    if (source.sourceId) {
      const shortId =
        source.sourceId.length > 8
          ? source.sourceId.substring(source.sourceId.length - 8)
          : source.sourceId;
      return `Manual Answer (${shortId})`;
    }
    return 'Manual Answer';
  }

  if (source.sourceType === 'knowledge_base_document') {
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
