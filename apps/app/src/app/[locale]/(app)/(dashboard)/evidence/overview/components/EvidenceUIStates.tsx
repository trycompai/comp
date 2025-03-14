import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { Skeleton } from "@bubba/ui/skeleton";
import { AlertCircle, FileQuestion } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@bubba/ui/alert";

// Component for chart skeleton loading state
export const ChartSkeleton = ({ height = "h-64" }: { height?: string }) => (
	<div className="space-y-4">
		<div className="flex justify-between items-center">
			<Skeleton className="h-4 w-32" />
			<Skeleton className="h-4 w-24" />
		</div>
		<Skeleton className={`w-full ${height} rounded-md`} />
	</div>
);

export const EvidenceOverviewSkeleton = () => {
	return (
		<div className="space-y-8">
			{/* Summary cards skeleton */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{["empty", "draft", "review", "uptodate"].map((type) => (
					<Skeleton key={`skeleton-${type}`} className="h-[120px] w-full" />
				))}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
				{/* Department Chart Skeleton */}
				<Card>
					<CardHeader>
						<CardTitle>
							<Skeleton className="h-6 w-48" />
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartSkeleton />
					</CardContent>
				</Card>

				{/* Assignee Chart Skeleton */}
				<Card>
					<CardHeader>
						<CardTitle>
							<Skeleton className="h-6 w-48" />
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartSkeleton />
					</CardContent>
				</Card>

				{/* Framework Chart Skeleton */}
				<Card className="md:col-span-2">
					<CardHeader>
						<CardTitle>
							<Skeleton className="h-6 w-48" />
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartSkeleton height="h-80" />
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

interface ErrorStateProps {
	message?: string;
}

export const EvidenceErrorState = ({ message }: ErrorStateProps) => {
	return (
		<Alert variant="destructive" className="my-8">
			<AlertCircle className="h-4 w-4" />
			<AlertTitle>Error</AlertTitle>
			<AlertDescription>
				{message || "Failed to load the evidence dashboard"}
			</AlertDescription>
		</Alert>
	);
};

export const EvidenceEmptyState = () => {
	return (
		<Alert className="my-8">
			<FileQuestion className="h-4 w-4" />
			<AlertTitle>No Data</AlertTitle>
			<AlertDescription>
				No evidence data is currently available. Try refreshing or check back
				later.
			</AlertDescription>
		</Alert>
	);
};
