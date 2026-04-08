import { Logger } from '@nestjs/common';

const logger = new Logger('TimelinesSlack');

const WEBHOOK_URL = process.env.SLACK_CX_WEBHOOK_URL;

async function sendSlack(text: string) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    logger.warn('Failed to send Slack notification', err);
  }
}

export function notifyReadyForReview({
  orgName,
  frameworkName,
  phaseName,
}: {
  orgName: string;
  frameworkName: string;
  phaseName: string;
}) {
  sendSlack(
    `:bell: *Ready for Review*\n` +
    `Org: *${orgName}*\n` +
    `Framework: ${frameworkName}\n` +
    `Phase: ${phaseName}`,
  );
}

export function notifyPhaseCompleted({
  orgName,
  frameworkName,
  phaseName,
  completionType,
}: {
  orgName: string;
  frameworkName: string;
  phaseName: string;
  completionType: string;
}) {
  const typeLabel =
    completionType === 'AUTO_TASKS' ? 'all evidence tasks completed' :
    completionType === 'AUTO_POLICIES' ? 'all policies published' :
    completionType === 'AUTO_PEOPLE' ? 'all employees compliant' :
    completionType === 'AUTO_UPLOAD' ? 'document uploaded' :
    'manually completed';

  sendSlack(
    `:white_check_mark: *Phase Completed*\n` +
    `Org: *${orgName}*\n` +
    `Framework: ${frameworkName}\n` +
    `Phase: ${phaseName} (${typeLabel})`,
  );
}

export function notifyTimelineCompleted({
  orgName,
  frameworkName,
}: {
  orgName: string;
  frameworkName: string;
}) {
  sendSlack(
    `:tada: *Timeline Completed*\n` +
    `Org: *${orgName}*\n` +
    `Framework: ${frameworkName} - all phases complete!`,
  );
}
