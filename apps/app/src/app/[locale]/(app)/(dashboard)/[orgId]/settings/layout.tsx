import { auth } from "@/auth";
import { getI18n } from "@/locales/server";
import { SecondaryMenu } from "@bubba/ui/secondary-menu";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function Layout({
	children,
}: {
	children: React.ReactNode;
}) {
	const t = await getI18n();
	const session = await auth();
	const user = session?.user;
	const orgId = user?.organizationId;

	if (!session) {
		return redirect("/");
	}

	if (!session.user.isAdmin) {
		return redirect(`/${orgId}`);
	}

	return (
		<div className="max-w-[1200px] m-auto">
			<Suspense fallback={<div>Loading...</div>}>
				<SecondaryMenu
					items={[
						{ path: `/${orgId}/settings`, label: t("settings.general.title") },
						{
							path: `/${orgId}/settings/members`,
							label: t("settings.members.title"),
						},
						{
							path: `/${orgId}/settings/api-keys`,
							label: t("settings.api_keys.title"),
						},
						{
							path: `/${orgId}/settings/billing`,
							label: t("settings.billing.title"),
							enabled: false,
						},
					]}
				/>
			</Suspense>

			<main className="mt-8">{children}</main>
		</div>
	);
}
