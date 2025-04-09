import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@comp/ui/card";
import { Skeleton } from "@comp/ui/skeleton";

export default function Loading() {
	return (
		<div className="space-y-12">
			<div className="grid gap-4 md:grid-cols-1 select-none">
				{[1, 2].map((index) => (
					<Card
						key={index}
						className="select-none hover:bg-muted/40 transition-colors duration-200 overflow-hidden"
					>
						<CardHeader>
							<CardTitle className="flex items-center">
								<Skeleton className="h-6 w-48" />
								<Skeleton className="h-5 w-16 ml-2" />
							</CardTitle>
							<CardDescription>
								<div className="flex items-start justify-between gap-2">
									<Skeleton className="h-10 w-[70%]" />
									<Skeleton className="hidden md:block h-6 w-24" />
								</div>
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex flex-col gap-4">
								<div className="flex flex-col gap-3">
									<div className="space-y-1.5">
										<div className="flex items-center justify-between">
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-4 w-12" />
										</div>
										<Skeleton className="h-2 w-full" />
									</div>
								</div>

								<div className="grid grid-cols-3 gap-4 mt-1">
									<div className="flex flex-col items-start gap-1 border-r pr-3">
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-5 w-16" />
									</div>
									<div className="flex flex-col items-start gap-1 border-r pr-3">
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-5 w-16" />
									</div>
									<div className="flex flex-col items-start gap-1">
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-5 w-16" />
									</div>
								</div>
							</div>
						</CardContent>
						<CardFooter>
							<Skeleton className="h-4 w-40" />
						</CardFooter>
					</Card>
				))}
			</div>
		</div>
	);
}
