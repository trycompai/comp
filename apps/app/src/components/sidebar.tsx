import { Cookies } from "@/utils/constants";
import { Icons } from "@bubba/ui/icons";
import { cookies } from "next/headers";
import Link from "next/link";
import { MainMenu } from "./main-menu";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OrgMenu } from "./org-menu";

export async function Sidebar() {
	const session = await auth();
	const user = session?.user;
	const organizationId = user?.organizationId;

	if (!organizationId) {
		redirect("/");
	}

	const cookieStore = await cookies();

	const initialItems = cookieStore.has(Cookies.MenuConfig)
		? JSON.parse(cookieStore.get(Cookies.MenuConfig)?.value ?? "")
		: null;

	return (
		<aside className="h-screen flex-shrink-0 flex-col justify-between fixed top-0 ml-4 pb-4 items-center hidden md:flex">
			<div className="flex flex-col items-center justify-center">
				<div className="mt-2 todesktop:mt-[35px]">
					<div className="mt-2 items-center justify-center">
						<Link href={`/${organizationId}`}>
							<Icons.Logo />
						</Link>
					</div>
				</div>
				<MainMenu
					userIsAdmin={user?.isAdmin ?? false}
					initialItems={initialItems}
					organizationId={organizationId}
				/>
			</div>

			<Suspense>
				<OrgMenu />
			</Suspense>
		</aside>
	);
}
