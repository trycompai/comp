import { StagehandEmbed } from './components/stagehandEmbed';

export default async function BrowserbasePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  return <StagehandEmbed organizationId={orgId} />;
}
