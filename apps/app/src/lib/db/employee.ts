import { trainingVideos } from '@/lib/data/training-videos';
import { db } from '@db/server';

/**
 * Creates training video tracking entries for a new member
 * This function is exported so it can be used in other invitation flows
 */
export async function createTrainingVideoEntries(memberId: string) {
  // Create an entry for each video in the system
  const result = await db.employeeTrainingVideoCompletion.createMany({
    data: trainingVideos.map((video) => ({
      memberId: memberId,
      videoId: video.id,
    })),
    skipDuplicates: true,
  });

  return result;
}
