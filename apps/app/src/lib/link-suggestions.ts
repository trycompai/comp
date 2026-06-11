const DEFAULT_THRESHOLD = 0.65;
const DEFAULT_TOP_K = 5;
const DEFAULT_DEPARTMENT_BOOST = 0.05;

export interface Candidate {
  id: string;
  score: number; // raw cosine similarity from the vector store
  department?: string;
}

export interface LinkSuggestionsOptions {
  source: { department?: string };
  candidates: Candidate[];
  threshold?: number;
  topK?: number;
  departmentBoost?: number;
}

export interface LinkSuggestion {
  id: string;
  score: number; // boosted score (may be > raw)
}

/**
 * Apply department-match boost, threshold filter, and top-K cap to a list of
 * raw similarity candidates. Pure function; no I/O.
 *
 * Coefficients live here — single place to tune the math.
 */
export function linkSuggestions({
  source,
  candidates,
  threshold = DEFAULT_THRESHOLD,
  topK = DEFAULT_TOP_K,
  departmentBoost = DEFAULT_DEPARTMENT_BOOST,
}: LinkSuggestionsOptions): LinkSuggestion[] {
  if (candidates.length === 0) return [];

  const sourceDept = source.department;
  const shouldBoost = (candidateDept?: string) =>
    sourceDept !== undefined &&
    candidateDept !== undefined &&
    candidateDept !== 'none' &&
    sourceDept === candidateDept;

  const boosted: LinkSuggestion[] = candidates.map((c) => ({
    id: c.id,
    score: shouldBoost(c.department) ? c.score + departmentBoost : c.score,
  }));

  return boosted
    .filter((c) => c.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
