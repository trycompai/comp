import { Skeleton } from "@comp/ui/skeleton";
import { Suspense } from "react";
import { UserMenu } from "./user-menu";

export async function Header() {
	return (
		<header className="flex justify-between items-center bg-backgroundSoft py-4 top-0 z-10 px-4 border-b border-border/40 static">
			<div className="flex space-x-2 ml-auto">
				<Suspense
					fallback={<Skeleton className="h-8 w-8 rounded-full" />}
				>
					<UserMenu />
				</Suspense>
			</div>
		</header>
	);
}
