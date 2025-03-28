import { auth } from "@/auth";
import { getI18n } from "@/locales/server";
import { SecondaryMenu } from "@bubba/ui/secondary-menu";

export default async function Layout({
	children,
}: {
	children: React.ReactNode;
}) {
	const t = await getI18n();
	const session = await auth();
	const organizationId = session?.user?.organizationId;

	return (
		<div className="max-w-[1200px] mx-auto">
			<SecondaryMenu
				items={[
					{
						path: `/${organizationId}/tests`,
						label: t("tests.dashboard.overview"),
					},
					{
						path: `/${organizationId}/tests/all`,
						label: t("tests.dashboard.all"),
					},
				]}
			/>
			<main className="mt-8">{children}</main>
		</div>
	);
}
