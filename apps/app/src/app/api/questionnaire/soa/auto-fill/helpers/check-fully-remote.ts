import { db } from '@db';
import { logger } from '@/utils/logger';

export async function checkIfFullyRemote(organizationId: string): Promise<boolean> {
  try {
    const teamWorkContext = await db.context.findFirst({
      where: {
        organizationId,
        question: {
          contains: 'How does your team work',
          mode: 'insensitive',
        },
      },
    });

    logger.info('Team work context check for SOA auto-fill', {
      organizationId,
      found: !!teamWorkContext,
      question: teamWorkContext?.question,
      answer: teamWorkContext?.answer,
    });

    if (teamWorkContext?.answer) {
      const answerLower = teamWorkContext.answer.toLowerCase();
      const isFullyRemote = answerLower.includes('fully remote') || answerLower.includes('fully-remote');
      
      logger.info('Fully remote check result for SOA auto-fill', {
        organizationId,
        answer: teamWorkContext.answer,
        answerLower,
        isFullyRemote,
        containsFullyRemote: answerLower.includes('fully remote'),
        containsFullyRemoteHyphen: answerLower.includes('fully-remote'),
      });
      
      return isFullyRemote;
    } else {
      logger.info('No team work context found for SOA auto-fill', {
        organizationId,
      });
      return false;
    }
  } catch (error) {
    logger.warn('Failed to check team work mode for SOA', {
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

