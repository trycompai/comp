import useSWR from 'swr';
import Image from 'next/image';
import { useParams } from 'next/navigation';

const fetcher = async (key: string) => {
  const res = await fetch(key, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch image url');
  }
  const json = (await res.json()) as { url?: string };
  if (!json.url) {
    throw new Error('No url returned');
  }
  return json.url;
};

export function PolicyImagePreview({ image }: { image: string }) {
  const params = useParams<{ orgId: string }>();
  const orgIdParam = params?.orgId;
  const organizationId = Array.isArray(orgIdParam) ? orgIdParam[0] : orgIdParam;

  const { data: signedUrl, error, isLoading } = useSWR(
    () =>
      image && organizationId
        ? `/api/get-image-url?key=${encodeURIComponent(image)}&organizationId=${encodeURIComponent(organizationId)}`
        : null,
    fetcher,
  );

  if (isLoading) {
    return <div className="h-[500px] w-full flex items-center justify-center text-sm text-muted-foreground">Loading image...</div>;
  }

  if (error || !signedUrl) {
    return <div className="h-[500px] w-full flex items-center justify-center text-sm text-muted-foreground">Failed to load image</div>;
  }

  return (
    <div className="overflow-hidden w-full h-[500px]">
      <Image
        key={signedUrl}
        src={signedUrl}
        alt="Policy image"
        width={800}
        height={600}
        className="h-full w-full object-contain"
      />
    </div>
  );
}