import { AppOnboarding } from '@/components/app-onboarding';
import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Cloud Compliance',
  };
}

export default async function CloudTests({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  const cloudProviders = await getCloudProviders();

  if (cloudProviders.length > 0) {
    return redirect(`/${orgId}/tests/dashboard`);
  }

  return (
    <div className="m-auto">
      <AppOnboarding
        title={'Cloud Compliance'}
        description={
          'Test and validate your cloud infrastructure security with automated tests and reports.'
        }
        imageSrcLight="/onboarding/cloud-light.webp"
        imageSrcDark="/onboarding/cloud-dark.webp"
        imageAlt="Cloud Management"
        sheetName="create-cloud-test-sheet"
        cta="Connect Cloud"
        href={`/${orgId}/integrations`}
        faqs={[
          {
            questionKey: 'What are cloud compliance tests?',
            answerKey:
              'Cloud compliance tests are automated checks that verify your cloud environment against security best practices and compliance standards.',
          },
          {
            questionKey: 'Why are they important?',
            answerKey:
              'They help ensure your cloud infrastructure is secure, identify misconfigurations, and provide evidence for audits like SOC 2 and ISO 27001.',
          },
          {
            questionKey: 'How do I get started?',
            answerKey:
              "Connect your cloud provider (AWS, GCP, Azure) in the Integrations page, and we'll automatically start running tests and generating reports.",
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
