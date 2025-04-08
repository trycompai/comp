import { SecondaryMenu } from "@comp/ui/secondary-menu";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { Suspense } from "react";
import { getI18n } from "@/locales/server";

export default async function Layout({
	children,
}: {
	children: React.ReactNode;
}) {
	const t = await getI18n();

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const orgId = session?.session.activeOrganizationId;

	return (
		<div className="max-w-[1200px] m-auto">
			<Suspense>
				<SecondaryMenu
					items={[
						{
							path: `/${orgId}/risk`,
							label: t("risk.dashboard.title"),
						},
					]}
				/>

				<main className="mt-8">{children}</main>
			</Suspense>
		</div>
	);
}
