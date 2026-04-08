import { TemplateEditorPage } from './components/TemplateEditorPage';

interface PageProps {
  params: Promise<{ orgId: string; templateId: string }>;
}

export default async function TimelineTemplateEditPage({ params }: PageProps) {
  const { orgId, templateId } = await params;

  return <TemplateEditorPage orgId={orgId} templateId={templateId} />;
}
