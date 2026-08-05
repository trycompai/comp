import type { GeneralTrainingVideoId } from '@gideon-defender/company';

/**
 * Represents a training video resource that can be used
 * for user education and compliance training.
 */
export interface TrainingVideo {
  /** Unique identifier for the video */
  id: string;
  /** Title of the training video */
  title: string;
  /** Detailed description of the video content */
  description: string;
  /** YouTube video identifier for embedding */
  youtubeId: string;
  /** Full URL to access the video */
  url: string;
}

/**
 * Videos keyed by the canonical IDs that `@gideon-defender/company` owns, shared
 * with the NestJS training service and the portal's complete-training route.
 *
 * Keying by the canonical union makes the lists exhaustive in BOTH directions:
 * a canonical ID with no entry here fails to compile, and an entry that isn't
 * canonical fails too. Both matter — completion requires a row for every
 * canonical ID, so a video we never render would leave employees permanently
 * unable to finish training, while a rendered video the API rejects would 400.
 *
 * The import is type-only on purpose: client components and a Trigger.dev task
 * import this file, and `@gideon-defender/company` requires `@gideon-defender/db` at
 * runtime.
 */
const trainingVideosById: Record<GeneralTrainingVideoId, Omit<TrainingVideo, 'id'>> = {
  'sat-1': {
    title: 'Security Awareness Training - Part 1',
    description: 'Security Awareness Training - Part 1',
    youtubeId: 'N-sBS3uCWB4',
    url: 'https://www.youtube.com/watch?v=N-sBS3uCWB4',
  },
  'sat-2': {
    title: 'Security Awareness Training - Part 2',
    description: 'Security Awareness Training - Part 2',
    youtubeId: 'JwQNwhDyXig',
    url: 'https://www.youtube.com/watch?v=JwQNwhDyXig',
  },
  'sat-3': {
    title: 'Security Awareness Training - Part 3',
    description: 'Security Awareness Training - Part 3',
    youtubeId: 'fzMNw_-KEGE',
    url: 'https://www.youtube.com/watch?v=fzMNw_-KEGE',
  },
  'sat-4': {
    title: 'Security Awareness Training - Part 4',
    description: 'Security Awareness Training - Part 4',
    youtubeId: 'WbpqjH9kI2Y',
    url: 'https://www.youtube.com/watch?v=WbpqjH9kI2Y',
  },
  'sat-5': {
    title: 'Security Awareness Training - Part 5',
    description: 'Security Awareness Training - Part 5',
    youtubeId: 'Clvfkm6azDs',
    url: 'https://www.youtube.com/watch?v=Clvfkm6azDs',
  },
};

export const trainingVideos: readonly TrainingVideo[] = Object.entries(trainingVideosById).map(
  ([id, video]) => ({ id, ...video }),
);
