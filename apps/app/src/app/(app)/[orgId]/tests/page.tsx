import { AppOnboarding } from '@/components/app-onboarding';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getGT } from 'gt-next/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getGT();
  
  return {
    title: t('Cloud Compliance'),
  };
}

export default async function CloudTests({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  const cloudProviders = await getCloudProviders();

  if (cloudProviders.length > 0) {
    return redirect(`/${orgId}/tests/dashboard`);
  }

  const t = await getGT();

  return (
    <div className="m-auto">
      <AppOnboarding
        title={t('Cloud Compliance')}
        description={t(
          'Test and validate your cloud infrastructure security with automated tests and reports.'
        )}
        imageSrcLight="/onboarding/cloud-light.webp"
        imageSrcDark="/onboarding/cloud-dark.webp"
        imageAlt={t('Cloud Management')}
        sheetName="create-cloud-test-sheet"
        cta={t('Connect Cloud')}
        href={`/${orgId}/integrations`}
        faqs={[
          {
            questionKey: t('What are cloud compliance tests?'),
            answerKey: t(
              'Cloud compliance tests are automated checks that verify your cloud environment against security best practices and compliance standards.'
            ),
          },
          {
            questionKey: t('Why are they important?'),
            answerKey: t(
              'They help ensure your cloud infrastructure is secure, identify misconfigurations, and provide evidence for audits like SOC 2 and ISO 27001.'
            ),
          },
          {
            questionKey: t('How do I get started?'),
            answerKey: t(
              "Connect your cloud provider (AWS, GCP, Azure) in the Integrations page, and we'll automatically start running tests and generating reports."
            ),
          },
        ]}
      />
    </div>
  );
}

const getCloudProviders = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return [];
  }

  const orgId = session.session?.activeOrganizationId;

  if (!orgId) {
    return [];
  }

  const cloudProviders = await db.integration.findMany({
    where: {
      organizationId: orgId,
      integrationId: {
        in: ['aws', 'gcp', 'azure'],
      },
    },
  });

  return cloudProviders;
};
