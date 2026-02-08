'use client';

import type { TrainingVideo } from '@/lib/data/training-videos';
import type { EmployeeTrainingVideoCompletion, Member, Organization, Policy, User } from '@db';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@trycompai/design-system';
import { Download } from '@trycompai/design-system/icons';
import { PolicyItem } from '../../devices/components/PolicyItem';
import type { DeviceWithChecks, FleetPolicy, Host } from '../../devices/types';
import { downloadTrainingCertificate } from '../actions/download-training-certificate';

const CHECK_NAMES: Record<string, string> = {
  disk_encryption: 'Disk Encryption',
  antivirus: 'Antivirus',
  password_policy: 'Password Policy',
  screen_lock: 'Screen Lock',
};

const PLATFORM_LABELS: Record<string, string> = {
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

export const EmployeeTasks = ({
  employee,
  policies,
  trainingVideos,
  host,
  fleetPolicies,
  organization,
  memberDevice,
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
  memberDevice: DeviceWithChecks | null;
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
      memberId: employee.id,
      organizationId: organization.id,
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
    <Tabs defaultValue="policies">
      <Stack gap="md">
        <TabsList>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="training">Training Videos</TabsTrigger>
          <TabsTrigger value="device">Device</TabsTrigger>
        </TabsList>

        <TabsContent value="policies">
          {policies.length === 0 ? (
            <div className="py-6 text-center">
              <Text variant="muted">No policies required to sign.</Text>
            </div>
          ) : (
            <Table variant="bordered">
              <TableHeader>
                <TableRow>
                  <TableHead>Policy</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => {
                  const isCompleted = policy.signedBy.includes(employee.id);
                  return (
                    <TableRow key={policy.id}>
                      <TableCell>
                        <Text size="sm" weight="medium">
                          {policy.name}
                        </Text>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isCompleted ? 'default' : 'destructive'}>
                          {isCompleted ? 'Signed' : 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="training">
          <Stack gap="md">
            {trainingVideos.length === 0 ? (
              <div className="py-6 text-center">
                <Text variant="muted">No training videos required to watch.</Text>
              </div>
            ) : (
              <Table variant="bordered">
                <TableHeader>
                  <TableRow>
                    <TableHead>Training Video</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainingVideos.map((video) => {
                    const isCompleted = video.completedAt !== null;
                    return (
                      <TableRow key={video.id}>
                        <TableCell>
                          <Text size="sm" weight="medium">
                            {video.metadata.title}
                          </Text>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isCompleted ? 'default' : 'destructive'}>
                            {isCompleted ? 'Complete' : 'Incomplete'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Text size="sm" variant="muted">
                            {isCompleted && video.completedAt
                              ? new Date(video.completedAt).toLocaleDateString()
                              : '—'}
                          </Text>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {allTrainingComplete && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCertificate}
                  iconLeft={<Download size={14} />}
                >
                  Download Certificate
                </Button>
              </div>
            )}
          </Stack>
        </TabsContent>

        <TabsContent value="device">
          {memberDevice ? (
            <Stack gap="4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <Text size="lg" weight="semibold">
                        {memberDevice.name}
                      </Text>
                      <Text size="sm" variant="muted">
                        {PLATFORM_LABELS[memberDevice.platform] ?? memberDevice.platform}{' '}
                        {memberDevice.osVersion}
                        {memberDevice.hardwareModel ? ` \u2022 ${memberDevice.hardwareModel}` : ''}
                      </Text>
                    </div>
                    <Badge variant={memberDevice.isCompliant ? 'default' : 'destructive'}>
                      {memberDevice.isCompliant ? 'Compliant' : 'Non-Compliant'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Text size="sm" variant="muted">
                        Hostname
                      </Text>
                      <Text size="sm" weight="medium">
                        {memberDevice.hostname}
                      </Text>
                    </div>
                    <div>
                      <Text size="sm" variant="muted">
                        Serial Number
                      </Text>
                      <Text size="sm" weight="medium">
                        {memberDevice.serialNumber ?? 'N/A'}
                      </Text>
                    </div>
                    <div>
                      <Text size="sm" variant="muted">
                        Last Check-in
                      </Text>
                      <Text size="sm" weight="medium">
                        {memberDevice.lastCheckIn
                          ? new Date(memberDevice.lastCheckIn).toLocaleString()
                          : 'Never'}
                      </Text>
                    </div>
                    <div>
                      <Text size="sm" variant="muted">
                        Agent Version
                      </Text>
                      <Text size="sm" weight="medium">
                        {memberDevice.agentVersion ?? 'N/A'}
                      </Text>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {memberDevice.checks.length > 0 ? (
                <Table variant="bordered">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Check</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberDevice.checks.map((check) => (
                      <TableRow key={check.id}>
                        <TableCell>
                          <Text size="sm" weight="medium">
                            {CHECK_NAMES[check.checkType] ?? check.checkType}
                          </Text>
                        </TableCell>
                        <TableCell>
                          <Text size="sm" variant="muted">
                            {check.details &&
                            typeof check.details === 'object' &&
                            'message' in check.details
                              ? String(check.details.message)
                              : '—'}
                          </Text>
                        </TableCell>
                        <TableCell>
                          <Badge variant={check.passed ? 'default' : 'destructive'}>
                            {check.passed ? 'Pass' : 'Fail'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Text size="sm" variant="muted">
                  No compliance checks have been run yet.
                </Text>
              )}
            </Stack>
          ) : host ? (
            <Card>
              <CardHeader>
                <Text size="lg" weight="semibold">
                  {host.computer_name}&apos;s Policies
                </Text>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {fleetPolicies.map((policy) => (
                    <PolicyItem key={policy.id} policy={policy} />
                  ))}
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
  );
};
