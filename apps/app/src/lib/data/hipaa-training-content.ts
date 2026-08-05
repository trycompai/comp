import type { TrainingVideoId } from '@gideon-defender/company';

// Tied to the canonical ID that both training-completion paths validate
// against. Deliberately a local literal with a type-only link rather than a
// re-export: client components import this file, and @gideon-defender/company pulls
// in @gideon-defender/db at runtime. The annotation still fails typecheck if the
// canonical ID ever changes, so the two cannot drift.
export const HIPAA_TRAINING_ID: Extract<TrainingVideoId, 'hipaa-sat-1'> = 'hipaa-sat-1';
