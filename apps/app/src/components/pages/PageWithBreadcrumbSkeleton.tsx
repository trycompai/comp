import React from "react";
import { Skeleton } from "@comp/ui/skeleton";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@comp/ui/breadcrumb";

interface PageWithBreadcrumbSkeletonProps {
	/**
	 * Number of breadcrumb items to show
	 * @default 2
	 */
	itemCount?: number;
	children?: React.ReactNode;
}

export default function PageWithBreadcrumbSkeleton({
	itemCount = 2,
	children,
}: PageWithBreadcrumbSkeletonProps) {
	return (
		<div className="flex flex-col gap-4">
			<Breadcrumb>
				<BreadcrumbList>
					{[...Array(itemCount)].map((_, index) => (
						<React.Fragment key={index}>
							<BreadcrumbItem>
								<Skeleton className="h-4 w-24" />
							</BreadcrumbItem>
							{index < itemCount - 1 && <BreadcrumbSeparator />}
						</React.Fragment>
					))}
				</BreadcrumbList>
			</Breadcrumb>
			{children}
		</div>
	);
}
