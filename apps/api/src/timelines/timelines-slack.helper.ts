import { Logger } from '@nestjs/common';

const logger = new Logger('TimelinesSlack');

const WEBHOOK_URL = process.env.SLACK_CX_WEBHOOK_URL;

async function sendSlack(blocks: unknown[], fallbackText: string) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: fallbackText, blocks }),
    });
  } catch (err) {
    logger.warn('Failed to send Slack notification', err);
  }
}

function section(text: string) {
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

function context(...items: string[]) {
  return {
    type: 'context',
    elements: items.map((t) => ({ type: 'mrkdwn', text: t })),
  };
}

function divider() {
  return { type: 'divider' };
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
    [
      section(`:bell:  *Ready for Review*`),
      section(
        `*${orgName}* marked *${phaseName}* as ready\n` +
        `_${frameworkName}_`,
      ),
      context(':arrow_right:  Customer is waiting for CX to begin the next phase'),
      divider(),
    ],
    `${orgName} - ${frameworkName}: ${phaseName} ready for review`,
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
    completionType === 'AUTO_TASKS' ? ':clipboard:  All evidence tasks completed' :
    completionType === 'AUTO_POLICIES' ? ':page_facing_up:  All policies published' :
    completionType === 'AUTO_PEOPLE' ? ':busts_in_silhouette:  All employees compliant' :
    completionType === 'AUTO_UPLOAD' ? ':paperclip:  Document uploaded' :
    ':pencil:  Manually completed';

  sendSlack(
    [
      section(`:white_check_mark:  *Phase Completed*`),
      section(
        `*${orgName}*  ·  _${frameworkName}_\n` +
        `Phase: *${phaseName}*`,
      ),
      context(typeLabel),
      divider(),
    ],
    `${orgName} - ${frameworkName}: ${phaseName} completed`,
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
    [
      section(`:tada:  *Timeline Completed*`),
      section(
        `*${orgName}* has completed all phases for *${frameworkName}*`,
      ),
      context(':checkered_flag:  Ready for final report delivery'),
      divider(),
    ],
    `${orgName} - ${frameworkName}: all phases complete`,
  );
}
