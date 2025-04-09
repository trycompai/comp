import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card";
import { Skeleton } from "@comp/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@comp/ui/table";
import PageWithBreadcrumbSkeleton from "@/components/pages/PageWithBreadcrumbSkeleton";

export default function Loading() {
	return (
		<PageWithBreadcrumbSkeleton>
			<div className="flex flex-col space-y-8">
				{/* Framework Overview Skeleton */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
					{/* Framework Info Card */}
					<Card>
						<CardHeader>
							<CardTitle>
								<Skeleton className="h-6 w-36" />
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-4/5" />
							<Skeleton className="h-4 w-24" />
						</CardContent>
					</Card>

					{/* Compliance Progress Card */}
					<Card>
						<CardHeader>
							<CardTitle>
								<Skeleton className="h-6 w-48" />
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-48" />
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Framework Controls Table Skeleton */}
				<Card>
					<CardContent className="p-0">
						<div className="rounded-md">
							<Table>
								<TableHeader>
									<TableRow>
										{["code", "name", "status"].map((column) => (
											<TableHead key={`header-${column}`}>
												<Skeleton className="h-5 w-20" />
											</TableHead>
										))}
									</TableRow>
								</TableHeader>
								<TableBody>
									{[...Array(10)].map((_, index) => (
										<TableRow key={`row-${index}`}>
											{["code", "name", "status"].map((column) => (
												<TableCell key={`cell-${index}-${column}`}>
													<Skeleton
														className={`h-4 ${
															column === "name"
																? "w-[70%]"
																: column === "code"
																	? "w-32"
																	: "w-24"
														}`}
													/>
												</TableCell>
											))}
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>
			</div>
		</PageWithBreadcrumbSkeleton>
	);
}
