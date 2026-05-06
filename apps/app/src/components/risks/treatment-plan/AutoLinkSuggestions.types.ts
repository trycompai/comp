import type { TaskStatus } from '@db';

export interface SuggestedTask {
  id: string;
  title: string;
  status: string;
  score: number;
}

export interface SuggestedControl {
  id: string;
  code: string;
  name: string;
  framework: string;
  score: number;
  viaTaskIds: string[];
}

export interface LinkedTask {
  id: string;
  title: string;
  status: TaskStatus;
  controls: { id: string; name: string }[];
}

export type Mode = 'fresh' | 'reassess';

export type State =
  | { kind: 'linked' }
  | { kind: 'empty' }
  | { kind: 'loading'; runId: string; publicAccessToken: string; mode: Mode }
  | {
      kind: 'suggestions';
      mode: Mode;
      tasks: SuggestedTask[];
      controls: SuggestedControl[];
      checkedTaskIds: Set<string>;
    }
  | { kind: 'failed'; reason: string; mode: Mode };

export function isControlDerived(
  c: SuggestedControl,
  checkedTaskIds: Set<string>,
): boolean {
  return c.viaTaskIds.some((id) => checkedTaskIds.has(id));
}
