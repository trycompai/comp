import { useI18n } from "@/locales/client";
import { Button } from "@bubba/ui/button";
import { Card, CardContent } from "@bubba/ui/card";
import { FileText } from "lucide-react";
import Link from "next/link";

export function NoPolicies() {
  const t = useI18n();

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">
          {t("policies.no_policies_title")}
        </h3>
        <p className="text-muted-foreground mb-6">
          {t("policies.no_policies_description")}
        </p>
        <Link href="/policies/new">
          <Button>{t("policies.create_first")}</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function NoResults({ hasFilters }: { hasFilters: boolean }) {
  const t = useI18n();

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">
          {t("common.empty_states.no_results.title")}
        </h3>
        <p className="text-muted-foreground">
          {hasFilters
            ? t("common.empty_states.no_results.description_filters")
            : t("common.empty_states.no_results.description")}
        </p>
      </CardContent>
    </Card>
  );
}
