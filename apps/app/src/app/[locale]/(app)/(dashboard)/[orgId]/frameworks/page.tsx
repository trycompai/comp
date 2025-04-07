import { getI18n } from "@/locales/server";
import PageWithBreadcrumb from "@/components/pages/PageWithBreadcrumb";
import { FrameworksOverview } from "./components/FrameworksOverview";
import { getAllFrameworkInstancesWithControls } from "./data/getAllFrameworkInstancesWithControls";

export async function generateMetadata() {
  const t = await getI18n();

  return {
    title: t("sidebar.frameworks"),
  };
}

export default async function DashboardPage() {
  const frameworksWithControls = await getAllFrameworkInstancesWithControls();

  return (
    <PageWithBreadcrumb breadcrumbs={[{ label: "Frameworks", current: true }]}>
      <FrameworksOverview frameworksWithControls={frameworksWithControls} />
    </PageWithBreadcrumb>
  );
}
