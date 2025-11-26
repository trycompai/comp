'use client';

import { Button } from '@comp/ui/button';
import { Card, CardContent } from '@comp/ui';
import { FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { QuestionnaireHistory } from './QuestionnaireHistory';

interface QuestionnaireOverviewProps {
  questionnaires: Awaited<ReturnType<typeof import('../data/queries').getQuestionnaires>>;
}

export function QuestionnaireOverview({ questionnaires }: QuestionnaireOverviewProps) {
  const params = useParams();
  const orgId = params.orgId as string;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl lg:text-2xl font-semibold text-foreground">
          Security Questionnaire
        </h1>
        <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed max-w-3xl">
          Automatically analyze and answer questionnaires using AI. Upload questionnaires from
          vendors, and our system will extract questions and generate answers based on your
          organization's policies and documentation.
        </p>
      </div>

      {/* New Questionnaire Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold text-foreground">Create New Questionnaire</h3>
                <p className="text-sm text-muted-foreground">
                  Upload a questionnaire file to extract questions and generate answers
                </p>
              </div>
            </div>
            <Button size="lg" asChild>
              <Link href={`/${orgId}/questionnaire/new_questionnaire`}>
                <Plus className="mr-2 h-4 w-4" />
                New Questionnaire
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History Section */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">History</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage your previously parsed questionnaires
          </p>
        </div>
        <QuestionnaireHistory questionnaires={questionnaires} orgId={orgId} />
      </div>
    </div>
  );
}

