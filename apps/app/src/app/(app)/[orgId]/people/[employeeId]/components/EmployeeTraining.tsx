'use client';

import type { TrainingVideo } from '@/lib/data/training-videos';
import { cn } from '@/lib/utils';
import type { EmployeeTrainingVideoCompletion, Member, Organization, User } from '@db';
import { Button, Stack, Text } from '@trycompai/design-system';
import {
  Certificate,
  CheckmarkFilled,
  Download,
  InformationFilled,
  WarningAltFilled,
} from '@trycompai/design-system/icons';
import { downloadHipaaCertificate } from '../actions/download-hipaa-certificate';
import { downloadTrainingCertificate } from '../actions/download-training-certificate';
import { downloadBase64Pdf } from './downloadBase64Pdf';

type TrainingVideoCompletion = EmployeeTrainingVideoCompletion & {
  metadata: TrainingVideo;
};

interface EmployeeTrainingVideosProps {
  employee: Member & { user: User };
  organization: Organization;
  trainingVideos: TrainingVideoCompletion[];
}

interface EmployeeHipaaTrainingProps {
  employee: Member & { user: User };
  organization: Organization;
  hipaaCompletedAt: Date | null;
}

function safeEmployeeName(employee: Member & { user: User }): string {
  return employee.user.name?.replace(/\s+/g, '-').toLowerCase() || 'employee';
}

export function EmployeeTrainingVideos({
  employee,
  organization,
  trainingVideos,
}: EmployeeTrainingVideosProps) {
  const completedVideos = trainingVideos.filter((video) => video.completedAt !== null);
  const allTrainingComplete =
    completedVideos.length === trainingVideos.length && trainingVideos.length > 0;
  const trainingCompletionDate = allTrainingComplete
    ? completedVideos.reduce<Date | null>((latest, video) => {
        if (!latest || !video.completedAt) return latest;
        return video.completedAt > latest ? video.completedAt : latest;
      }, completedVideos[0]?.completedAt || null)
    : null;

  const handleDownloadCertificate = async () => {
    if (!trainingCompletionDate) return;
    const result = await downloadTrainingCertificate({
      memberId: employee.id,
      organizationId: organization.id,
    });
    if (result?.data) {
      downloadBase64Pdf(result.data, `training-certificate-${safeEmployeeName(employee)}.pdf`);
    }
  };

  return (
    <>
      {!organization.securityTrainingStepEnabled ? (
        <div className="flex items-center gap-3 rounded-lg border border-muted bg-muted/30 p-4">
          <span className="shrink-0 text-muted-foreground">
            <InformationFilled size={20} />
          </span>
          <div>
            <Text weight="medium">Security training is managed outside of Comp AI</Text>
            <Text size="sm" variant="muted">
              Evidence for security training completion can be logged in the Security Awareness
              Training evidence task.
            </Text>
          </div>
        </div>
      ) : (
        <Stack gap="md">
          {trainingVideos.length > 0 && (
            <div
              className={cn(
                'flex items-center justify-between rounded-lg border p-4',
                allTrainingComplete ? 'border-primary/20 bg-primary/5' : 'border-muted bg-muted/30',
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    allTrainingComplete ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Certificate size={20} />
                </div>
                <div>
                  <Text weight="medium">
                    {allTrainingComplete
                      ? 'All Training Complete'
                      : `${completedVideos.length}/${trainingVideos.length} Videos Completed`}
                  </Text>
                  {trainingCompletionDate && (
                    <Text size="sm" variant="muted">
                      Completed on{' '}
                      {new Date(trainingCompletionDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  )}
                </div>
              </div>
              {allTrainingComplete && (
                <Button
                  type="button"
                  size="sm"
                  iconLeft={<Download size={16} />}
                  onClick={handleDownloadCertificate}
                >
                  Certificate
                </Button>
              )}
            </div>
          )}

          <Stack gap="sm">
            {trainingVideos.length === 0 ? (
              <div className="py-6 text-center">
                <Text variant="muted">No training videos required to watch.</Text>
              </div>
            ) : (
              trainingVideos.map((video) => {
                const isCompleted = video.completedAt !== null;

                return (
                  <div
                    key={video.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-3"
                  >
                    <Stack gap="xs">
                      <div className="flex items-center gap-2">
                        <span className={isCompleted ? 'text-primary' : 'text-destructive'}>
                          {isCompleted ? (
                            <CheckmarkFilled size={16} />
                          ) : (
                            <WarningAltFilled size={16} />
                          )}
                        </span>
                        <Text>{video.metadata.title}</Text>
                      </div>
                      {isCompleted && (
                        <Text size="xs" variant="muted">
                          Completed - {video.completedAt && new Date(video.completedAt).toLocaleDateString()}
                        </Text>
                      )}
                    </Stack>
                  </div>
                );
              })
            )}
          </Stack>
        </Stack>
      )}
    </>
  );
}

export function EmployeeHipaaTraining({
  employee,
  organization,
  hipaaCompletedAt,
}: EmployeeHipaaTrainingProps) {
  const handleDownloadCertificate = async () => {
    const result = await downloadHipaaCertificate({
      memberId: employee.id,
      organizationId: organization.id,
    });
    if (result?.data) {
      downloadBase64Pdf(result.data, `hipaa-training-certificate-${safeEmployeeName(employee)}.pdf`);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border p-4',
        hipaaCompletedAt ? 'border-primary/20 bg-primary/5' : 'border-muted bg-muted/30',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            hipaaCompletedAt ? 'bg-primary/10 text-primary' : 'text-destructive',
        )}
      >
          {hipaaCompletedAt ? <Certificate size={20} /> : <WarningAltFilled size={20} />}
        </span>
        <div>
          <Text weight="medium">
            {hipaaCompletedAt
              ? 'HIPAA Security Awareness Training Acknowledged'
              : 'HIPAA Security Awareness Training Not Completed'}
          </Text>
          <Text size="sm" variant="muted">
            {hipaaCompletedAt
              ? `Acknowledged on ${new Date(hipaaCompletedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}`
              : 'Employee has not yet acknowledged the HIPAA training in the portal.'}
          </Text>
        </div>
      </div>
      {hipaaCompletedAt && (
        <Button
          type="button"
          size="sm"
          iconLeft={<Download size={16} />}
          onClick={handleDownloadCertificate}
        >
          Certificate
        </Button>
      )}
    </div>
  );
}
