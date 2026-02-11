'use client';

import {
  Avatar,
  AvatarFallback,
  Badge,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  HStack,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Search } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';

import type { TrainingVideo } from '@/lib/data/training-videos';
import type { EmployeeTrainingVideoCompletion, Member, Policy, User } from '@db';

function getInitials(name: string, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

interface EmployeeCompletionChartProps {
  employees: (Member & {
    user: User;
  })[];
  policies: Policy[];
  trainingVideos: (EmployeeTrainingVideoCompletion & {
    metadata: TrainingVideo;
  })[];
  showAll?: boolean;
}

interface EmployeeTaskStats {
  id: string;
  name: string;
  email: string;
  totalTasks: number;
  policiesCompleted: number;
  trainingsCompleted: number;
  policiesTotal: number;
  trainingsTotal: number;
  overallPercentage: number;
}

export function EmployeeCompletionChart({
  employees,
  policies,
  trainingVideos,
  showAll = false,
}: EmployeeCompletionChartProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const [searchTerm, setSearchTerm] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(25);

  // Calculate completion data for each employee
  const employeeStats: EmployeeTaskStats[] = React.useMemo(() => {
    return employees.map((employee) => {
      const policiesCompletedCount = policies.filter((policy) =>
        policy.signedBy.includes(employee.id),
      ).length;

      const employeeTrainingVideos = trainingVideos.filter(
        (video) => video.memberId === employee.id && video.completedAt !== null,
      );
      const trainingsCompletedCount = employeeTrainingVideos.length;

      const uniqueTrainingVideosIds = [
        ...new Set(trainingVideos.map((video) => video.metadata.id)),
      ];
      const trainingVideosTotal = uniqueTrainingVideosIds.length;

      const totalItems = policies.length + trainingVideosTotal;
      const totalCompletedItems = policiesCompletedCount + trainingsCompletedCount;

      const overallPercentage = totalItems
        ? Math.round((totalCompletedItems / totalItems) * 100)
        : 0;

      return {
        id: employee.id,
        name: employee.user.name || employee.user.email.split('@')[0],
        email: employee.user.email,
        totalTasks: totalItems,
        policiesCompleted: policiesCompletedCount,
        trainingsCompleted: trainingsCompletedCount,
        policiesTotal: policies.length,
        trainingsTotal: trainingVideosTotal,
        overallPercentage,
      };
    });
  }, [employees, policies, trainingVideos]);

  // Filter employees based on search term
  const filteredStats = React.useMemo(() => {
    if (!searchTerm) return employeeStats;

    return employeeStats.filter(
      (stat) =>
        stat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stat.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [employeeStats, searchTerm]);

  // Sort employees by completion percentage
  const sortedStats = React.useMemo(() => {
    return [...filteredStats].sort((a, b) => b.overallPercentage - a.overallPercentage);
  }, [filteredStats]);

  const pageCount = Math.max(1, Math.ceil(sortedStats.length / perPage));
  const paginatedStats = React.useMemo(() => {
    if (!showAll) return sortedStats.slice(0, 5);
    const start = (page - 1) * perPage;
    return sortedStats.slice(start, start + perPage);
  }, [sortedStats, page, perPage, showAll]);

  // Check for empty data scenarios
  if (!employees.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No employee data available</EmptyTitle>
          <EmptyDescription>
            Employees will appear here once they are added to the organization.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (policies.length === 0 && !trainingVideos.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No tasks available</EmptyTitle>
          <EmptyDescription>
            Create policies or add training videos to track employee completion.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Stack gap="4">
      {showAll && (
        <div className="w-full md:max-w-[300px]">
          <InputGroup>
            <InputGroupAddon>
              <Search size={16} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </InputGroup>
        </div>
      )}

      {filteredStats.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{searchTerm ? 'No employees found' : 'No employees available'}</EmptyTitle>
            <EmptyDescription>
              {searchTerm
                ? 'Try adjusting your search.'
                : 'Employees will appear here once they are added.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table
          variant="bordered"
          pagination={
            showAll
              ? {
                  page,
                  pageCount,
                  onPageChange: setPage,
                  pageSize: perPage,
                  pageSizeOptions: [25, 50, 100],
                  onPageSizeChange: (size: number) => {
                    setPerPage(size);
                    setPage(1);
                  },
                }
              : undefined
          }
        >
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Policies</TableHead>
              <TableHead>Training</TableHead>
              <TableHead>Completion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedStats.map((stat) => {
              const allComplete = stat.overallPercentage === 100;
              return (
                <TableRow key={stat.id}>
                  <TableCell>
                    <HStack gap="3" align="center">
                      <Avatar>
                        <AvatarFallback>{getInitials(stat.name, stat.email)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <Link
                          href={`/${orgId}/people/${stat.id}`}
                          className="truncate text-sm font-medium hover:underline"
                        >
                          {stat.name}
                        </Link>
                        <Text variant="muted">{stat.email}</Text>
                      </div>
                    </HStack>
                  </TableCell>
                  <TableCell>
                    <Text size="sm">
                      {stat.policiesCompleted}/{stat.policiesTotal}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text size="sm">
                      {stat.trainingsCompleted}/{stat.trainingsTotal}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Badge variant={allComplete ? 'default' : 'destructive'}>
                      {stat.overallPercentage}%
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
