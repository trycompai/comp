import { auth } from "@comp/auth";
import { getI18n } from "@/locales/server";
import { SecondaryMenu } from "@comp/ui/secondary-menu";
import { headers } from "next/headers";
import { AppOnboarding } from "@/components/app-onboarding";
import { db } from "@comp/db";
import { Suspense, cache } from "react";

export default async function Layout({
	children,
}: {
	children: React.ReactNode;
}) {
	const t = await getI18n();

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const organizationId = session?.session?.activeOrganizationId;

	const tests = await getTestsOverview();
	console.log(tests);

	if (!tests.length) {
		return (
			<div className="max-w-[1200px] m-auto">
				<Suspense fallback={<div>Loading...</div>}>
					<div className="mt-8">
						<AppOnboarding
							title={t("app_onboarding.cloud_tests.title")}
							description={t("app_onboarding.cloud_tests.description")}
							imageSrc="/onboarding/cloud-tests.png"
							imageAlt="Cloud Security Testing"
							cta=""
							sheetName=""
							faqs={[
								{
									questionKey: t("app_onboarding.cloud_tests.faqs.question_1"),
									answerKey: t("app_onboarding.cloud_tests.faqs.answer_1"),
								},
								{
									questionKey: t("app_onboarding.cloud_tests.faqs.question_2"),
									answerKey: t("app_onboarding.cloud_tests.faqs.answer_2"),
								},
								{
									questionKey: t("app_onboarding.cloud_tests.faqs.question_3"),
									answerKey: t("app_onboarding.cloud_tests.faqs.answer_3"),
								},
							]}
						/>
					</div>
				</Suspense>
			</div>
		);
	}

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

const getTestsOverview = cache(async () => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const orgId = session?.session?.activeOrganizationId;

	if (!orgId) return [];

	const tests = await db.integrationResult.findMany({
		where: {
			organizationId: orgId,
		},
	});

	return tests;
});
