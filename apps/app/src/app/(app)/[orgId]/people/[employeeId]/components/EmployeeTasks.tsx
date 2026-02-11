'use client';

import type { TrainingVideo } from '@/lib/data/training-videos';
import type { EmployeeTrainingVideoCompletion, Member, Organization, Policy, User } from '@db';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Section,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@trycompai/design-system';
import { AlertCircle, Award, CheckCircle2, Download, Info } from 'lucide-react';
import type { FleetPolicy, Host } from '../../devices/types';
import { PolicyItem } from '../../devices/components/PolicyItem';
import { cn } from '@/lib/utils';

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

    try {
      const response = await fetch('/api/training/certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: employee.id,
          organizationId: organization.id,
        }),
      });

      if (!response.ok) {
        console.error('Failed to download certificate');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `training-certificate-${employee.user.name?.replace(/\s+/g, '-').toLowerCase() || 'employee'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download certificate:', error);
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
            {!organization.securityTrainingStepEnabled ? (
              <div className="flex items-center gap-3 rounded-lg border border-muted bg-muted/30 p-4">
                <Info className="h-5 w-5 shrink-0 text-muted-foreground" />
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
            )}
          </TabsContent>

          <TabsContent value="device">
            {!organization.deviceAgentStepEnabled ? (
              <div className="flex items-center gap-3 rounded-lg border border-muted bg-muted/30 p-4">
                <Info className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <Text weight="medium">Device agent is managed outside of Comp AI</Text>
                  <Text size="sm" variant="muted">
                    Evidence for device compliance can be logged in the Secure Device and Device List
                    evidence tasks.
                  </Text>
                </div>
              </div>
            ) : host ? (
              <Card>
                <CardHeader>
                  <CardTitle>{host.computer_name}&apos;s Policies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fleetPolicies.map((policy) => <PolicyItem key={policy.id} policy={policy} />)}
                  </div>
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
