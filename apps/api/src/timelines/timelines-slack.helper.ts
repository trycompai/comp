import { Logger } from '@nestjs/common';

const logger = new Logger('TimelinesSlack');

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    process.env.APP_URL ??
    'https://app.trycomp.ai'
  );
}

function adminTimelineUrl(orgId: string) {
  return `${appUrl()}/${orgId}/admin/organizations/${orgId}`;
}

/**
 * Escape dynamic user-supplied text before interpolating into Slack mrkdwn.
 * Prevents org names containing `<`, `>`, `&`, `|` from breaking link
 * syntax like `<url|text>` or rendering as unintended markup.
 */
function escapeMrkdwn(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendSlack(blocks: unknown[], fallbackText: string): Promise<void> {
  const webhookUrl = process.env.SLACK_CX_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: fallbackText, blocks }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.warn(
        `Slack webhook returned ${response.status}: ${body.slice(0, 200)}`,
      );
    }
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
}): Promise<void> {
  const link = adminTimelineUrl(orgId);
  const safeOrg = escapeMrkdwn(orgName);
  const safePhase = escapeMrkdwn(phaseName);
  const safeFramework = escapeMrkdwn(frameworkName);
  return sendSlack(
    [
      section(`:bell:  *Ready for Review*`),
      section(
        `*<${link}|${safeOrg}>*  (\`${orgId}\`)\n` +
        `Marked *${safePhase}* as ready  ·  _${safeFramework}_`,
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
}): Promise<void> {
  const typeLabel =
    completionType === 'AUTO_TASKS' ? ':clipboard:  All evidence tasks completed' :
    completionType === 'AUTO_POLICIES' ? ':page_facing_up:  All policies published' :
    completionType === 'AUTO_PEOPLE' ? ':busts_in_silhouette:  All employees compliant' :
    completionType === 'AUTO_FINDINGS' ? ':mag:  All auditor findings resolved' :
    completionType === 'AUTO_UPLOAD' ? ':paperclip:  Document uploaded' :
    ':pencil:  Manually completed';

  const link = adminTimelineUrl(orgId);
  const safeOrg = escapeMrkdwn(orgName);
  const safePhase = escapeMrkdwn(phaseName);
  const safeFramework = escapeMrkdwn(frameworkName);
  return sendSlack(
    [
      section(`:white_check_mark:  *Phase Completed*`),
      section(
        `*<${link}|${safeOrg}>*  (\`${orgId}\`)\n` +
        `Phase: *${safePhase}*  ·  _${safeFramework}_`,
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
}): Promise<void> {
  const link = adminTimelineUrl(orgId);
  const safeOrg = escapeMrkdwn(orgName);
  const safeFramework = escapeMrkdwn(frameworkName);
  return sendSlack(
    [
      section(`:tada:  *Timeline Completed*`),
      section(
        `*<${link}|${safeOrg}>*  (\`${orgId}\`) has completed all phases for *${safeFramework}*`,
      ),
      context(':checkered_flag:  Ready for final report delivery'),
      divider(),
    ],
    `${orgName} - ${frameworkName}: all phases complete`,
  );
}
