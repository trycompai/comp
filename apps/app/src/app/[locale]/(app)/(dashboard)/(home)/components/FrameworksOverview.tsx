"use client";

import { RequirementStatus } from "@/components/charts/requirement-status";
import { useI18n } from "@/locales/client";
import { Skeleton } from "@bubba/ui/skeleton";
import { useFrameworks } from "../hooks/useFrameworks";
import { FrameworkProgress } from "./FrameworkProgress";
import { FrameworkGrid } from "./FrameworksGrid";

export const FrameworksOverview = () => {
  const {
    frameworks,
    availableFrameworks,
    isLoading,
    isMutating,
    error,
    selectFrameworks,
  } = useFrameworks();

  const t = useI18n();

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-destructive">{t("frameworks.overview.error")}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-12">
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  const hasFramework = frameworks.length > 0;

  if (hasFramework) {
    return (
      <div className="space-y-12">
        <div className="grid gap-4 md:grid-cols-2">
          <FrameworkProgress frameworks={frameworks} />
          <RequirementStatus frameworks={frameworks} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-center min-h-[50vh] flex-col gap-4">
      <h2 className="text-lg font-semibold">
        {t("frameworks.overview.empty.title")}
      </h2>
      <p className="text-muted-foreground">
        {t("frameworks.overview.empty.description")}
      </p>
      <FrameworkGrid
        frameworks={availableFrameworks}
        onSubmit={selectFrameworks}
      />
    </div>
  );
};
