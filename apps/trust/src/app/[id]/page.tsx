import { Metadata } from 'next';
import ComplianceReport from './components/report';
import {
  findOrganizationByAnyId,
  getFrameworks,
  getPublishedControls,
  getPublishedPolicies,
} from './lib/data';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;

  const organization = await findOrganizationByAnyId(id);

  if (!organization) {
    return (
      <div>
        <div className="p-6 pb-6">
          <div className="flex h-screen flex-col items-center justify-center">
            <h1 className="text-2xl font-bold">Trust Portal Not Published</h1>
            <p className="text-muted-foreground text-sm">
              Please publish your trust portal and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const policies = await getPublishedPolicies(id);
  const controls = await getPublishedControls(id);
  const frameworks = await getFrameworks(id);

  return (
    <div>
      <div className="p-6 pb-6">
        <ComplianceReport
          organization={organization}
          policies={policies ?? []}
          controls={controls ?? []}
          frameworks={{
            soc2: frameworks?.soc2?.enabled ?? false,
            iso27001: frameworks?.iso27001?.enabled ?? false,
            gdpr: frameworks?.gdpr?.enabled ?? false,
            soc2_status: frameworks?.soc2?.status ?? 'started',
            iso27001_status: frameworks?.iso27001?.status ?? 'started',
            gdpr_status: frameworks?.gdpr?.status ?? 'started',
          }}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = (await params).id;
  const organization = await findOrganizationByAnyId(id);

  if (!organization) {
    return {
      title: 'Trust Portal Not Published',
    };
  }

  const title = `${organization.name} - Security Trust Center`;
  const description = `Find out the compliance and security posture of ${organization.name} against common cybersecurity frameworks like SOC 2, ISO 27001, and more.`;
  const isCustomDomain = organization.trust.find((trust) => trust.status === 'published')?.domain;
  const isFriendlyUrl = organization.trust.find(
    (trust) => trust.status === 'published',
  )?.friendlyUrl;

  const url = `https://${isCustomDomain ?? `trust.inc/${isFriendlyUrl ?? organization.id}`}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: 'Comp AI Trust Center',
      images: [
        {
          url: 'https://trycomp.ai/og.png',
          width: 1200,
          height: 630,
          alt: `${organization.name} Trust Center`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@trycompai',
      title,
      description,
      images: ['https://trycomp.ai/og.png'],
    },
  };
}
