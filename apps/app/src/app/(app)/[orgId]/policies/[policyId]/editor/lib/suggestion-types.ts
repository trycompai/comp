export interface DiffSegment {
  text: string;
  type: 'unchanged' | 'insert' | 'delete';
}

export interface SuggestionRange {
  id: string;
  type: 'modify' | 'insert' | 'delete';
  /** ProseMirror position: start of affected range */
  from: number;
  /** ProseMirror position: end of affected range */
  to: number;
  /** For modifications: word-level diff segments for inline rendering */
  segments: DiffSegment[];
  /** The proposed replacement text (for inserts and modifications) */
  proposedText: string;
  /** The original text being replaced (for modifications and deletions) */
  originalText: string;
  /** User decision */
  decision: 'pending' | 'accepted' | 'rejected' | 'loading';
}

export interface PositionMap {
  /** Maps 1-indexed markdown line number to ProseMirror position range */
  lineToPos: Map<number, { from: number; to: number }>;
  /** The markdown text generated from the doc */
  markdown: string;
}
