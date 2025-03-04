import { getI18n } from "@/locales/server";
import { SecondaryMenu } from "@bubba/ui/secondary-menu";
import { Suspense } from "react";

export default async function Layout({
	children,
}: {
	children: React.ReactNode;
}) {
	const t = await getI18n();

	return (
		<div className="max-w-[800px] m-auto">
			<Suspense fallback={<div>Loading...</div>}>
				<SecondaryMenu
					items={[
						{ path: "/settings", label: t("settings.general.title") },
						{ path: "/settings/members", label: t("settings.members.title") },
						{ path: "/settings/api-keys", label: t("settings.api_keys.title") },
						{
							path: "/settings/billing",
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
