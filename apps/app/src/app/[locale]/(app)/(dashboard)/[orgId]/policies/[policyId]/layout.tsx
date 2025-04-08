import { getI18n } from "@/locales/server";
import { SecondaryMenu } from "@comp/ui/secondary-menu";

interface LayoutProps {
	children: React.ReactNode;
	params: Promise<{ policyId: string; orgId: string }>;
}

export default async function Layout({ children, params }: LayoutProps) {
	const t = await getI18n();
	const { orgId, policyId } = await params;

	return (
		<div className="max-w-[1200px] m-auto flex flex-col gap-6">
			<SecondaryMenu
				items={[
					{
						path: `/${orgId}/policies`,
						label: t("policies.dashboard.title"),
					},
					{
						path: `/${orgId}/policies/all`,
						label: t("policies.dashboard.all"),
						activeOverrideIdPrefix: "pol_",
					},
				]}
			/>
			<div>{children}</div>
		</div>
	);
}
