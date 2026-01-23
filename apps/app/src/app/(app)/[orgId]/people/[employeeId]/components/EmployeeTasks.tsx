'use client';

import type { TrainingVideo } from '@/lib/data/training-videos';
import type { EmployeeTrainingVideoCompletion, Member, Organization, Policy, User } from '@db';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import {
  Section,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@trycompai/design-system';
import { AlertCircle, Award, CheckCircle2, Download, XCircle } from 'lucide-react';
import type { FleetPolicy, Host } from '../../devices/types';
import { downloadTrainingCertificate } from '../actions/download-training-certificate';

export const EmployeeTasks = ({
  employee,
  policies,
  trainingVideos,
  host,
  fleetPolicies,
  organization,
}: {
  employee: Member & {
    user: User;
  };
  policies: Policy[];
  trainingVideos: (EmployeeTrainingVideoCompletion & {
    metadata: TrainingVideo;
  })[];
  host: Host;
  fleetPolicies: FleetPolicy[];
  organization: Organization;
}) => {
  // Calculate training completion status
  const completedVideos = trainingVideos.filter((v) => v.completedAt !== null);
  const allTrainingComplete =
    completedVideos.length === trainingVideos.length && trainingVideos.length > 0;

  // Get the most recent completion date as the overall training completion date
  const trainingCompletionDate = allTrainingComplete
    ? completedVideos.reduce((latest, video) => {
        if (!latest || !video.completedAt) return latest;
        return video.completedAt > latest ? video.completedAt : latest;
      }, completedVideos[0]?.completedAt || null)
    : null;

  const handleDownloadCertificate = async () => {
    if (!trainingCompletionDate) return;

    const result = await downloadTrainingCertificate({
      userName: employee.user.name || 'Team Member',
      organizationName: organization.name,
      completedAt: trainingCompletionDate,
    });

    if (result?.data) {
      // Convert base64 to blob and download
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `training-certificate-${employee.user.name?.replace(/\s+/g, '-').toLowerCase() || 'employee'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  };
  return (
    <Section title="Employee Tasks">
      <Tabs defaultValue="policies">
        <Stack gap="lg">
          <TabsList>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="training">Training Videos</TabsTrigger>
            <TabsTrigger value="device">Device</TabsTrigger>
          </TabsList>

          <TabsContent value="policies">
            <Stack gap="sm">
              {policies.length === 0 ? (
                <div className="py-6 text-center">
                  <Text variant="muted">No policies required to sign.</Text>
                </div>
              ) : (
                policies.map((policy) => {
                  const isCompleted = policy.signedBy.includes(employee.id);

                  return (
                    <div
                      key={policy.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-3"
                    >
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                        <Text>{policy.name}</Text>
                      </div>
                    </div>
                  );
                })
              )}
            </Stack>
          </TabsContent>

          <TabsContent value="training">
            <Stack gap="md">
              {/* Training Completion Summary */}
              {trainingVideos.length > 0 && (
                <div
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-4',
                    allTrainingComplete
                      ? 'border-primary/20 bg-primary/5'
                      : 'border-muted bg-muted/30',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full',
                        allTrainingComplete ? 'bg-primary/10' : 'bg-muted',
                      )}
                    >
                      <Award
                        className={cn(
                          'h-5 w-5',
                          allTrainingComplete ? 'text-primary' : 'text-muted-foreground',
                        )}
                      />
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
                    <button
                      onClick={handleDownloadCertificate}
                      className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Certificate
                    </button>
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
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                            <Text>{video.metadata.title}</Text>
                          </div>
                          {isCompleted && (
                            <Text size="xs" variant="muted">
                              Completed -{' '}
                              {video.completedAt &&
                                new Date(video.completedAt).toLocaleDateString()}
                            </Text>
                          )}
                        </Stack>
                      </div>
                    );
                  })
                )}
              </Stack>
            </Stack>
          </TabsContent>

          <TabsContent value="device">
            {host ? (
              <Card>
                <CardHeader>
                  <CardTitle>{host.computer_name}&apos;s Policies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {fleetPolicies.map((policy) => (
                    <div
                      key={policy.id}
                      className={cn(
                        'hover:bg-muted/50 flex items-center justify-between rounded-md border border-l-4 p-3 shadow-sm transition-colors',
                        policy.response === 'pass' ? 'border-l-primary' : 'border-l-destructive',
                      )}
                    >
                      <Text weight="medium">{policy.name}</Text>
                      {policy.response === 'pass' ? (
                        <div className="flex items-center gap-1 text-primary">
                          <CheckCircle2 size={16} />
                          <Text size="sm">Pass</Text>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-destructive">
                          <XCircle size={16} />
                          <Text size="sm">Fail</Text>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <div className="py-6 text-center">
                <Text variant="muted">No device found.</Text>
              </div>
            )}
          </TabsContent>
        </Stack>
      </Tabs>
    </Section>
  );
};
