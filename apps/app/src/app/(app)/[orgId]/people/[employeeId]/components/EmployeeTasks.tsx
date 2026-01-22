'use client';

import type { TrainingVideo } from '@/lib/data/training-videos';
import type { EmployeeTrainingVideoCompletion, Member, Policy, User } from '@db';

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
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { FleetPolicy, Host } from '../../devices/types';
import { PolicyItem } from '../../devices/components/PolicyItem';

export const EmployeeTasks = ({
  employee,
  policies,
  trainingVideos,
  host,
  fleetPolicies,
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
}) => {
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
                            {video.completedAt && new Date(video.completedAt).toLocaleDateString()}
                          </Text>
                        )}
                      </Stack>
                    </div>
                  );
                })
              )}
            </Stack>
          </TabsContent>

          <TabsContent value="device">
            {host ? (
              <Card>
                <CardHeader>
                  <CardTitle>{host.computer_name}&apos;s Policies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {fleetPolicies.map((policy) => <PolicyItem key={policy.id} policy={policy} />)}
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
