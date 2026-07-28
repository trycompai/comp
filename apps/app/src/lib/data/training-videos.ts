import type { GeneralTrainingVideoId } from '@trycompai/company';

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
 * A rendered video whose ID is one the training-completion paths actually
 * accept. `@trycompai/company` owns the canonical ID list, shared with the
 * NestJS training service and the portal's complete-training route.
 */
type CanonicalTrainingVideo = Omit<TrainingVideo, 'id'> & {
  id: GeneralTrainingVideoId;
};

export const trainingVideos: readonly TrainingVideo[] = [
  {
    id: 'sat-1',
    title: 'Security Awareness Training - Part 1',
    description: 'Security Awareness Training - Part 1',
    youtubeId: 'N-sBS3uCWB4',
    url: 'https://www.youtube.com/watch?v=N-sBS3uCWB4',
  },
  {
    id: 'sat-2',
    title: 'Security Awareness Training - Part 2',
    description: 'Security Awareness Training - Part 2',
    youtubeId: 'JwQNwhDyXig',
    url: 'https://www.youtube.com/watch?v=JwQNwhDyXig',
  },
  {
    id: 'sat-3',
    title: 'Security Awareness Training - Part 3',
    description: 'Security Awareness Training - Part 3',
    youtubeId: 'fzMNw_-KEGE',
    url: 'https://www.youtube.com/watch?v=fzMNw_-KEGE',
  },
  {
    id: 'sat-4',
    title: 'Security Awareness Training - Part 4',
    description: 'Security Awareness Training - Part 4',
    youtubeId: 'WbpqjH9kI2Y',
    url: 'https://www.youtube.com/watch?v=WbpqjH9kI2Y',
  },
  {
    id: 'sat-5',
    title: 'Security Awareness Training - Part 5',
    description: 'Security Awareness Training - Part 5',
    youtubeId: 'Clvfkm6azDs',
    url: 'https://www.youtube.com/watch?v=Clvfkm6azDs',
  },
] as const satisfies readonly CanonicalTrainingVideo[];
