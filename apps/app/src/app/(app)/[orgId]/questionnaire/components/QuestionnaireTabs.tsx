'use client';

import { AppOnboarding } from '@/components/app-onboarding';
import {
  PageHeader,
  PageLayout,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import { AdditionalDocumentsSection } from '../knowledge-base/additional-documents/components';
import { KnowledgeBaseHeader } from '../knowledge-base/components/KnowledgeBaseHeader';
import { ContextSection } from '../knowledge-base/context/components';
import { ManualAnswersSection } from '../knowledge-base/manual-answers/components';
import { PublishedPoliciesSection } from '../knowledge-base/published-policies/components';
import { QuestionnaireOverview } from '../start_page/components';
import type {
  ContextEntry,
  KBDocument,
  ManualAnswer,
  PublishedPolicy,
  QuestionnaireListItem,
} from './types';

interface QuestionnaireTabsProps {
  organizationId: string;
  // Questionnaires tab
  questionnaires: QuestionnaireListItem[];
  hasPublishedPolicies: boolean;
  // Knowledge Base tab
  policies: PublishedPolicy[];
  contextEntries: ContextEntry[];
  manualAnswers: ManualAnswer[];
  documents: KBDocument[];
}

export function QuestionnaireTabs({
  organizationId,
  questionnaires,
  hasPublishedPolicies,
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
