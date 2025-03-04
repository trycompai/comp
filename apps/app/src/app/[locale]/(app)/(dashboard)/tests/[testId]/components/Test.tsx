"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { useI18n } from "@/locales/client";
import { useTest } from "../../hooks/useTest";
import { Skeleton } from "@bubba/ui/skeleton";
import { AlertCircle, CheckCircle2, Clock, Info, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@bubba/ui/alert";
import { Label } from "@bubba/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@bubba/ui/tabs";
import { Badge } from "@bubba/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@bubba/ui/table";

interface CloudTestDetailsProps {
  testId: string;
}

export function Test({ testId }: CloudTestDetailsProps) {
  const t = useI18n();
  const { cloudTest, isLoading, error } = useTest(testId);

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
  const providerLabel = cloudTest.provider === "aws" 
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
      case "FAILED":
        return <Badge className="bg-red-500">{status}</Badge>;
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
          <CardTitle>Concerns</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {cloudTest.resultDetails?.Description}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remediation</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <p>{cloudTest.resultDetails?.Remediation?.Recommendation?.Text}</p>
          {cloudTest.resultDetails?.Remediation?.Recommendation?.Url}
        </CardContent>
      </Card>

      <Tabs defaultValue="resources">
        <TabsList>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="raw-log">Raw Log</TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Id</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Partition</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cloudTest.resultDetails?.Resources.map((run: any) => (
                      <TableRow key={run.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {run.Id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {run.Type}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {run.Region}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {run.Partition}
                          </div>
                        </TableCell>
                      
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw-log" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="block mb-2">Provider Results</Label>
                  <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
                    {JSON.stringify(cloudTest.resultDetails, null, 2)}
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