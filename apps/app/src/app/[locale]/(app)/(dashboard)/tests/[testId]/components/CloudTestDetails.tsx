"use client";

import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { useI18n } from "@/locales/client";
import { cn } from "@bubba/ui/cn";
import { useCloudTestDetails } from "../../hooks/useCloudTest";
import { Skeleton } from "@bubba/ui/skeleton";
import { AlertCircle, CheckCircle2, Clock, Info, Play, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@bubba/ui/alert";
import { Label } from "@bubba/ui/label";
import { formatDate } from "@/utils/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@bubba/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@bubba/ui/accordion";
import { Badge } from "@bubba/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@bubba/ui/table";

interface CloudTestDetailsProps {
  testId: string;
}

export function CloudTestDetails({ testId }: CloudTestDetailsProps) {
  const t = useI18n();
  const { cloudTest, isLoading, error } = useCloudTestDetails(testId);

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error.message || "An unexpected error occurred"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!cloudTest) return null;

  // Format the test provider for display
  const providerLabel = cloudTest.provider === "AWS" 
    ? "Amazon Web Services" 
    : cloudTest.provider === "AZURE" 
      ? "Microsoft Azure" 
      : "Google Cloud Platform";

  // Format the test status for display with appropriate badge color
  const getStatusBadge = (status: string) => {
    switch(status.toUpperCase()) {
      case "ACTIVE":
        return <Badge className="bg-green-500">{status}</Badge>;
      case "DRAFT":
        return <Badge className="bg-yellow-500">{status}</Badge>;
      case "ARCHIVED":
        return <Badge className="bg-gray-500">{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Helper function to get the appropriate icon for test run status
  const getRunStatusIcon = (status: string, result: string | null) => {
    if (status === "COMPLETED") {
      if (result === "PASS") {
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      } else if (result === "FAIL") {
        return <XCircle className="h-4 w-4 text-red-500" />;
      } else {
        return <Info className="h-4 w-4 text-blue-500" />;
      }
    } else if (status === "IN_PROGRESS") {
      return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
    } else if (status === "PENDING") {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    } else {
      return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {cloudTest.title} {getStatusBadge(cloudTest.status)}
        </h1>
        <div>
          <Badge variant="outline" className="ml-2">{providerLabel}</Badge>
        </div>
      </div>

      {cloudTest.description && (
        <p className="text-muted-foreground">{cloudTest.description}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Test Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Created By</Label>
              <p>{cloudTest.createdBy.name || cloudTest.createdBy.email || "Unknown"}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Last Updated By</Label>
              <p>{cloudTest.updatedBy.name || cloudTest.updatedBy.email || "Unknown"}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Created At</Label>
              <p>
                {formatDate(cloudTest.createdAt.toISOString(), "MMM d, yyyy HH:mm")}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Last Updated</Label>
              <p>
                {formatDate(cloudTest.updatedAt.toISOString(), "MMM d, yyyy HH:mm")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">Test Runs</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Run History</CardTitle>
            </CardHeader>
            <CardContent>
              {cloudTest.runs.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No test runs recorded yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Executed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cloudTest.runs.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRunStatusIcon(run.status, run.result)}
                            {run.status}
                          </div>
                        </TableCell>
                        <TableCell>
                          {run.result ? (
                            <Badge
                              className={cn(
                                run.result === "PASS" && "bg-green-500",
                                run.result === "FAIL" && "bg-red-500",
                                run.result === "ERROR" && "bg-orange-500"
                              )}
                            >
                              {run.result}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {run.startedAt 
                            ? formatDate(run.startedAt.toISOString(), "MMM d, yyyy HH:mm") 
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {run.completedAt 
                            ? formatDate(run.completedAt.toISOString(), "MMM d, yyyy HH:mm") 
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {run.executedBy?.name || run.executedBy?.email || "System"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="block mb-2">Provider Configuration</Label>
                  <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
                    {JSON.stringify(cloudTest.config, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 