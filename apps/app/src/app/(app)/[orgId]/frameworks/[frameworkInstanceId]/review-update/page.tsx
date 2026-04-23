import { serverApi } from '@/lib/api-server';
import { redirect } from 'next/navigation';
import type { UpdatePreview } from '@/types/framework-versioning';
import { ReviewUpdateContent } from './components/ReviewUpdateContent';

interface PageProps {
  params: Promise<{
    orgId: string;
    frameworkInstanceId: string;
  }>;
}

export default async function ReviewUpdatePage({ params }: PageProps) {
  const { orgId, frameworkInstanceId } = await params;

  const [frameworkRes, previewRes] = await Promise.all([
    serverApi.get<any>(`/v1/frameworks/${frameworkInstanceId}`),
    serverApi.get<{ data: UpdatePreview }>(
      `/v1/frameworks/${frameworkInstanceId}/update-preview`,
    ),
  ]);

  // No update available (latest version matches current) → bounce back.
  if (!frameworkRes.data || !previewRes.data?.data) {
    redirect(`/${orgId}/frameworks/${frameworkInstanceId}`);
  }

  const framework = frameworkRes.data;
  const frameworkName = framework.framework?.name ?? 'Framework';

  // Intentionally skip PageLayout here — the review-update page manages its
  // own full-viewport layout with a single scrollable region in the middle.
  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-[1400px] flex-col overflow-hidden px-4 pt-4 md:px-6 md:pt-6">
      <ReviewUpdateContent
        orgId={orgId}
        frameworkInstanceId={frameworkInstanceId}
        frameworkName={frameworkName}
        initialPreview={previewRes.data.data}
      />
    </div>
  );
}
