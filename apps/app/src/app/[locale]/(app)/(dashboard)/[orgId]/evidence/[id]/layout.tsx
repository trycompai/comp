import { auth } from "@/auth";
import { getI18n } from "@/locales/server";
import { PathProvider } from "./PathProvider";
import { SecondaryMenu } from "@bubba/ui/secondary-menu";

export default async function Layout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ id: string }>;
}) {
	const t = await getI18n();
	const session = await auth();
	const user = session?.user;
	const organizationId = user?.organizationId;
	const { id } = await params;

	return (
		<div className="max-w-[1200px] space-y-4 m-auto">
			<SecondaryMenu
				showBackButton
				backButtonHref={`/${organizationId}/evidence/list`}
				items={[
					{
						path: `/${organizationId}/evidence/${id}`,
						label: t("evidence.edit"),
					},
				]}
			/>

			<main className="mt-8">{children}</main>
		</div>
	);
}
