'use client';

import { AppOnboarding } from '@/components/app-onboarding';
import {
  PageHeader,
  PageLayout,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@trycompai/design-system';
import { AdditionalDocumentsSection } from '../knowledge-base/additional-documents/components';
import { KnowledgeBaseHeader } from '../knowledge-base/components/KnowledgeBaseHeader';
import { ContextSection } from '../knowledge-base/context/components';
import type {
  getContextEntries,
  getKnowledgeBaseDocuments,
  getManualAnswers,
  getPublishedPolicies,
} from '../knowledge-base/data/queries';
import { ManualAnswersSection } from '../knowledge-base/manual-answers/components';
import { PublishedPoliciesSection } from '../knowledge-base/published-policies/components';
import { SOAFrameworkTable } from '../soa/components/SOAFrameworkTable';
import { QuestionnaireOverview } from '../start_page/components';
import type { getQuestionnaires } from '../start_page/data/queries';

// Use type inference from SOAFrameworkTable props
type SOAFrameworkTableProps = Parameters<typeof SOAFrameworkTable>[0];

interface SOAData {
  framework: SOAFrameworkTableProps['framework'];
  configuration: SOAFrameworkTableProps['configuration'];
  document: SOAFrameworkTableProps['document'];
  isFullyRemote: boolean;
  canApprove: boolean;
  approver: SOAFrameworkTableProps['approver'];
  isPendingApproval: boolean;
  canCurrentUserApprove: boolean;
  currentMemberId: string | null;
  ownerAdminMembers: SOAFrameworkTableProps['ownerAdminMembers'];
}

interface QuestionnaireTabsProps {
  organizationId: string;
  // Questionnaires tab
  questionnaires: Awaited<ReturnType<typeof getQuestionnaires>>;
  hasPublishedPolicies: boolean;
  // SOA tab (conditional)
  showSOATab: boolean;
  soaData?: SOAData | null;
  soaError?: string | null;
  // Knowledge Base tab
  policies: Awaited<ReturnType<typeof getPublishedPolicies>>;
  contextEntries: Awaited<ReturnType<typeof getContextEntries>>;
  manualAnswers: Awaited<ReturnType<typeof getManualAnswers>>;
  documents: Awaited<ReturnType<typeof getKnowledgeBaseDocuments>>;
}

export function QuestionnaireTabs({
  organizationId,
  questionnaires,
  hasPublishedPolicies,
  showSOATab,
  soaData,
  soaError,
  policies,
  contextEntries,
  manualAnswers,
  documents,
}: QuestionnaireTabsProps) {
  // Show onboarding if no published policies exist
  if (!hasPublishedPolicies) {
    return (
      <PageLayout header={<PageHeader title="Questionnaires" />}>
        <AppOnboarding
          title={'Security Questionnaire'}
          description={
            "Automatically answer security questionnaires with the information we have about your company. Upload questionnaires from vendors and we'll extract the questions and provide answers based on your policies and organizational details."
          }
          ctaDisabled={false}
          cta={'Publish policies'}
          ctaTooltip="To use this feature you need to publish policies first"
          href={`/${organizationId}/policies`}
          imageSrcLight="/questionaire/tmp-questionaire-empty-state.png"
          imageSrcDark="/questionaire/tmp-questionaire-empty-state.png"
          imageAlt="Security Questionnaire"
          faqs={[
            {
              questionKey: 'What is a security questionnaire?',
              answerKey:
                "A security questionnaire is a document used by vendors and partners to assess your organization's security practices and compliance posture.",
            },
            {
              questionKey: 'Why do I need published policies?',
              answerKey:
                "Published policies are used to get accurate answers. The system uses your organization's policies and context to answer questionnaire questions automatically.",
            },
            {
              questionKey: 'How does it work?',
              answerKey:
                'Upload a questionnaire file, our AI will extract the questions and find answers based on your published policies and context. You can review and edit answers before exporting.',
            },
          ]}
        />
      </PageLayout>
    );
  }

  return (
    <Tabs defaultValue="questionnaires">
      <PageLayout
        header={
          <PageHeader
            title="Questionnaires"
            tabs={
              <TabsList variant="underline">
                <TabsTrigger value="questionnaires">Security Questionnaire</TabsTrigger>
                {showSOATab && <TabsTrigger value="soa">Statement of Applicability</TabsTrigger>}
                <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
              </TabsList>
            }
          />
        }
      >
        {/* Questionnaires Tab */}
        <TabsContent value="questionnaires">
          <QuestionnaireOverview questionnaires={questionnaires} />
        </TabsContent>

        {/* SOA Tab (conditional) */}
        {showSOATab && (
          <TabsContent value="soa">
            {soaError ? (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-semibold text-foreground lg:text-xl">
                    Statement of Applicability
                  </h2>
                  <Text variant="muted" size="sm">
                    Auto-complete Statement of Applicability for ISO 27001. Generate answers based
                    on your organization's policies and documentation.
                  </Text>
                </div>
                <div className="flex items-center justify-center rounded-lg border py-12">
                  <Text variant="muted">{soaError}</Text>
                </div>
              </div>
            ) : soaData ? (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-semibold text-foreground lg:text-xl">
                    Statement of Applicability
                  </h2>
                  <Text variant="muted" size="sm">
                    Auto-complete Statement of Applicability for ISO 27001. Generate answers based
                    on your organization's policies and documentation.
                  </Text>
                </div>
                <SOAFrameworkTable
                  framework={soaData.framework}
                  configuration={soaData.configuration}
                  document={soaData.document}
                  organizationId={organizationId}
                  isFullyRemote={soaData.isFullyRemote}
                  canApprove={soaData.canApprove}
                  approver={soaData.approver as Parameters<typeof SOAFrameworkTable>[0]['approver']}
                  isPendingApproval={soaData.isPendingApproval}
                  canCurrentUserApprove={soaData.canCurrentUserApprove}
                  currentMemberId={soaData.currentMemberId}
                  ownerAdminMembers={
                    soaData.ownerAdminMembers as Parameters<
                      typeof SOAFrameworkTable
                    >[0]['ownerAdminMembers']
                  }
                />
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-semibold text-foreground lg:text-xl">
                    Statement of Applicability
                  </h2>
                  <Text variant="muted" size="sm">
                    Auto-complete Statement of Applicability for ISO 27001. Generate answers based
                    on your organization's policies and documentation.
                  </Text>
                </div>
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              </div>
            )}
          </TabsContent>
        )}

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge-base">
          <KnowledgeBaseHeader organizationId={organizationId} />
          <div className="mt-6 flex flex-col gap-6">
            {/* Published Policies and Context Sections - Side by Side */}
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
              <PublishedPoliciesSection policies={policies} />
              <ContextSection contextEntries={contextEntries} />
            </div>
            {/* Manual Answers Section */}
            <ManualAnswersSection manualAnswers={manualAnswers} />
            {/* Additional Documents Section */}
            <AdditionalDocumentsSection organizationId={organizationId} documents={documents} />
          </div>
        </TabsContent>
      </PageLayout>
    </Tabs>
  );
}
