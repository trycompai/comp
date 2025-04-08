import { AppOnboarding } from "@/components/app-onboarding";
import { getI18n } from "@/locales/server";
import { setStaticParamsLocale } from "next-international/server";

export default async function CloudTests({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	const t = await getI18n();
	setStaticParamsLocale(locale);

	return (
		<div className="max-w-[1200px] m-auto">
			<div className="mt-8">
				<AppOnboarding
					title={t("app_onboarding.cloud_tests.title")}
					description={t("app_onboarding.cloud_tests.description")}
					imageSrc="/onboarding/cloud-management.webp"
					imageAlt="Cloud Management"
					sheetName="create-cloud-test-sheet"
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
		</div>
	);
}
