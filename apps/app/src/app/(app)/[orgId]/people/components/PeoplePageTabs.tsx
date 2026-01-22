'use client';

import {
  PageHeader,
  PageLayout,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import type { ReactNode } from 'react';

interface PeoplePageTabsProps {
  peopleContent: ReactNode;
  employeeTasksContent: ReactNode | null;
  devicesContent: ReactNode;
  showEmployeeTasks: boolean;
}

export function PeoplePageTabs({
  peopleContent,
  employeeTasksContent,
  devicesContent,
  showEmployeeTasks,
}: PeoplePageTabsProps) {
  return (
    <Tabs defaultValue="people">
      <PageLayout
        header={
          <PageHeader
            title="People"
            tabs={
              <TabsList variant="underline">
                <TabsTrigger value="people">People</TabsTrigger>
                {showEmployeeTasks && (
                  <TabsTrigger value="employee-tasks">Employee Tasks</TabsTrigger>
                )}
                <TabsTrigger value="devices">Employee Devices</TabsTrigger>
              </TabsList>
            }
          />
        }
      >
        <TabsContent value="people">{peopleContent}</TabsContent>
        {showEmployeeTasks && (
          <TabsContent value="employee-tasks">{employeeTasksContent}</TabsContent>
        )}
        <TabsContent value="devices">{devicesContent}</TabsContent>
      </PageLayout>
    </Tabs>
  );
}
