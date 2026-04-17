import { Logger } from '@nestjs/common';

const logger = new Logger('TimelinesSlack');

function appUrl() {
  return process.env.APP_URL ?? 'https://app.trycomp.ai';
}

function adminTimelineUrl(orgId: string) {
  return `${appUrl()}/${orgId}/admin/organizations/${orgId}`;
}

async function sendSlack(blocks: unknown[], fallbackText: string) {
  const webhookUrl = process.env.SLACK_CX_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
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
  orgId,
  orgName,
  frameworkName,
  phaseName,
}: {
  orgId: string;
  orgName: string;
  frameworkName: string;
  phaseName: string;
}) {
  const link = adminTimelineUrl(orgId);
  sendSlack(
    [
      section(`:bell:  *Ready for Review*`),
      section(
        `*<${link}|${orgName}>*  (\`${orgId}\`)\n` +
        `Marked *${phaseName}* as ready  ·  _${frameworkName}_`,
      ),
      context(':arrow_right:  Customer is waiting for CX to begin the next phase'),
      divider(),
    ],
    `${orgName} - ${frameworkName}: ${phaseName} ready for review`,
  );
}

export function notifyPhaseCompleted({
  orgId,
  orgName,
  frameworkName,
  phaseName,
  completionType,
}: {
  orgId: string;
  orgName: string;
  frameworkName: string;
  phaseName: string;
  completionType: string;
}) {
  const typeLabel =
    completionType === 'AUTO_TASKS' ? ':clipboard:  All evidence tasks completed' :
    completionType === 'AUTO_POLICIES' ? ':page_facing_up:  All policies published' :
    completionType === 'AUTO_PEOPLE' ? ':busts_in_silhouette:  All employees compliant' :
    completionType === 'AUTO_FINDINGS' ? ':mag:  All auditor findings resolved' :
    completionType === 'AUTO_UPLOAD' ? ':paperclip:  Document uploaded' :
    ':pencil:  Manually completed';

  const link = adminTimelineUrl(orgId);
  sendSlack(
    [
      section(`:white_check_mark:  *Phase Completed*`),
      section(
        `*<${link}|${orgName}>*  (\`${orgId}\`)\n` +
        `Phase: *${phaseName}*  ·  _${frameworkName}_`,
      ),
      context(typeLabel),
      divider(),
    ],
    `${orgName} - ${frameworkName}: ${phaseName} completed`,
  );
}

export function notifyTimelineCompleted({
  orgId,
  orgName,
  frameworkName,
}: {
  orgId: string;
  orgName: string;
  frameworkName: string;
}) {
  const link = adminTimelineUrl(orgId);
  sendSlack(
    [
      section(`:tada:  *Timeline Completed*`),
      section(
        `*<${link}|${orgName}>*  (\`${orgId}\`) has completed all phases for *${frameworkName}*`,
      ),
      context(':checkered_flag:  Ready for final report delivery'),
      divider(),
    ],
    `${orgName} - ${frameworkName}: all phases complete`,
  );
}
