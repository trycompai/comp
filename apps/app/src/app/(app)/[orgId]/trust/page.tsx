import { serverApi } from '@/lib/api-server';
import { Button, PageHeader, PageLayout } from '@trycompai/design-system';
import { Launch } from '@trycompai/design-system/icons';
import type { Metadata } from 'next';
import Link from 'next/link';
import { TrustPortalGettingStarted } from './components/TrustPortalGettingStarted';
import { TrustPortalSwitch } from './portal-settings/components/TrustPortalSwitch';

export default async function TrustPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const [settingsRes, customLinksRes, vendorsRes, certificatesRes, documentsRes] =
    await Promise.all([
      serverApi.get('/v1/trust-portal/settings'),
      serverApi.get('/v1/trust-portal/custom-links?organizationId=' + orgId),
      serverApi.get('/v1/trust-portal/vendors?all=true'),
      serverApi.post('/v1/trust-portal/compliance-resources/list', {
        organizationId: orgId,
      }),
      serverApi.post('/v1/trust-portal/documents/list', {
        organizationId: orgId,
      }),
    ]);

  const settings = settingsRes.data as any;
  const isTrustConfigured = settings?.isConfigured ?? true;
  const customLinks = Array.isArray(customLinksRes.data)
    ? customLinksRes.data
    : [];
  const vendors = Array.isArray(vendorsRes.data) ? vendorsRes.data : [];
  const certificateResources = Array.isArray(certificatesRes.data)
    ? certificatesRes.data
    : [];
  const documents = Array.isArray(documentsRes.data) ? documentsRes.data : [];

  // Map compliance resources to fileName props
  const API_FRAMEWORK_TO_PROP: Record<string, string> = {
    iso_27001: 'iso27001FileName',
    iso_42001: 'iso42001FileName',
    gdpr: 'gdprFileName',
    hipaa: 'hipaaFileName',
    soc2_type1: 'soc2type1FileName',
    soc2_type2: 'soc2type2FileName',
    soc3: 'soc3FileName',
    pci_dss: 'pcidssFileName',
    nen_7510: 'nen7510FileName',
    iso_9001: 'iso9001FileName',
    pipeda: 'pipedaFileName',
    ccpa: 'ccpaFileName',
  };

  const certificateFiles: Record<string, string | null> = {
    iso27001FileName: null,
    iso42001FileName: null,
    gdprFileName: null,
    hipaaFileName: null,
    soc2type1FileName: null,
    soc2type2FileName: null,
    soc3FileName: null,
    pcidssFileName: null,
    nen7510FileName: null,
    iso9001FileName: null,
    pipedaFileName: null,
    ccpaFileName: null,
  };

  for (const resource of certificateResources) {
    const propKey = resource?.framework
      ? API_FRAMEWORK_TO_PROP[resource.framework]
      : undefined;
    if (propKey) {
      certificateFiles[propKey] = resource.fileName ?? null;
    }
  }

  // Build the public trust portal URL
  const portalUrl =
    settings?.domainVerified && settings.domain
      ? `https://${settings.domain}`
      : `https://trust.inc/${settings?.friendlyUrl ?? orgId}`;

  return (
    <PageLayout
      header={
        <PageHeader
          title="Trust Portal"
          actions={
            <Button iconRight={<Launch className="size-3" />}>
              <Link href={portalUrl} target="_blank" rel="noopener noreferrer">
                Visit Trust Portal
              </Link>
            </Button>
          }
        />
      }
    >
      {!isTrustConfigured && <TrustPortalGettingStarted portalUrl={portalUrl} />}
      <TrustPortalSwitch
        orgId={orgId}
        enabled={settings?.enabled ?? false}
        slug={settings?.friendlyUrl ?? orgId}
        domain={settings?.domain ?? ''}
        domainVerified={settings?.domainVerified ?? false}
        contactEmail={settings?.contactEmail ?? null}
        primaryColor={settings?.primaryColor ?? null}
        soc2type1={settings?.soc2type1 ?? false}
        soc2type2={settings?.soc2type2 ?? false}
        soc3={settings?.soc3 ?? false}
        iso27001={settings?.iso27001 ?? false}
        iso42001={settings?.iso42001 ?? false}
        gdpr={settings?.gdpr ?? false}
        hipaa={settings?.hipaa ?? false}
        pcidss={settings?.pcidss ?? false}
        nen7510={settings?.nen7510 ?? false}
        iso9001={settings?.iso9001 ?? false}
        pipeda={settings?.pipeda ?? false}
        ccpa={settings?.ccpa ?? false}
        soc2type1Status={settings?.soc2type1Status ?? 'started'}
        soc2type2Status={settings?.soc2type2Status ?? 'started'}
        soc3Status={settings?.soc3Status ?? 'started'}
        iso27001Status={settings?.iso27001Status ?? 'started'}
        iso42001Status={settings?.iso42001Status ?? 'started'}
        gdprStatus={settings?.gdprStatus ?? 'started'}
        hipaaStatus={settings?.hipaaStatus ?? 'started'}
        pcidssStatus={settings?.pcidssStatus ?? 'started'}
        nen7510Status={settings?.nen7510Status ?? 'started'}
        iso9001Status={settings?.iso9001Status ?? 'started'}
        pipedaStatus={settings?.pipedaStatus ?? 'started'}
        ccpaStatus={settings?.ccpaStatus ?? 'started'}
        faqs={settings?.faqs ?? null}
        iso27001FileName={certificateFiles.iso27001FileName}
        iso42001FileName={certificateFiles.iso42001FileName}
        gdprFileName={certificateFiles.gdprFileName}
        hipaaFileName={certificateFiles.hipaaFileName}
        soc2type1FileName={certificateFiles.soc2type1FileName}
        soc2type2FileName={certificateFiles.soc2type2FileName}
        soc3FileName={certificateFiles.soc3FileName}
        pcidssFileName={certificateFiles.pcidssFileName}
        nen7510FileName={certificateFiles.nen7510FileName}
        iso9001FileName={certificateFiles.iso9001FileName}
        pipedaFileName={certificateFiles.pipedaFileName}
        ccpaFileName={certificateFiles.ccpaFileName}
        additionalDocuments={documents.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          description: doc.description,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        }))}
        overview={{
          overviewTitle: settings?.overviewTitle ?? null,
          overviewContent: settings?.overviewContent ?? null,
          showOverview: settings?.showOverview ?? false,
        }}
        customLinks={customLinks}
        vendors={vendors}
        faviconUrl={settings?.faviconUrl ?? null}
      />
    </PageLayout>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Trust Portal',
  };
}
