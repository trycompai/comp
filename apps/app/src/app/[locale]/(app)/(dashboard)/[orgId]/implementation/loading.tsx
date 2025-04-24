import { Alert, AlertDescription, AlertTitle } from "@comp/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@comp/ui/card";
import { Progress } from "@comp/ui/progress";
import { Skeleton } from "@comp/ui/skeleton";

export default async function Loading() {
	return (
		<div className="space-y-6">
			<Alert variant="default" className="bg-primary/5 border-primary/40 rounded-sm">
				<AlertTitle>
					<span className="blur-sm">Welcome to Comp AI!</span>
				</AlertTitle>
				<AlertDescription>
					<span className="blur-sm">Complete the steps below to complete your onboarding and get started with Comp AI.</span>
				</AlertDescription>
				<div className="flex flex-col gap-2 mt-4">
					<Progress value={0} className="w-full h-2" />
					<div className="flex justify-between">
						<span className="text-xs text-muted-foreground blur-sm">
							0 / 5
						</span>
					</div>
				</div>
			</Alert>
			<div className="flex flex-col gap-4">
				{[...Array(5)].map((_, index) => (
					<Card key={index}>
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-4 justify-between w-full">
								<Skeleton className="h-5 w-1/3" />
							</CardTitle>
							<CardDescription className="text-sm text-muted-foreground flex flex-col gap-4">
								<Skeleton className="h-4 w-2/3" />
							</CardDescription>
						</CardHeader>
						<CardContent />
						<CardFooter className="justify-end">
							<Skeleton className="h-10 w-24" />
						</CardFooter>
					</Card>
				))}
			</div>
		</div>
	);
}
