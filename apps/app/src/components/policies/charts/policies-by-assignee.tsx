import React, { type CSSProperties } from "react";
import { getI18n } from "@/locales/server";
import { db } from "@bubba/db";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { unstable_cache } from "next/cache";

interface Props {
  organizationId: string;
}

interface UserPolicyStats {
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  totalPolicies: number | undefined;
  publishedPolicies: number | undefined;
  draftPolicies: number | undefined;
  archivedPolicies: number | undefined;
  needsReviewPolicies: number | undefined;
}

const policyStatus = {
  published: "bg-primary",
  draft: "bg-[var(--chart-open)]",
  archived: "bg-[var(--chart-pending)]",
  needs_review: "bg-[hsl(var(--destructive))]",
};

export async function PoliciesByAssignee({ organizationId }: Props) {
  const t = await getI18n();
  const userStats = await userData(organizationId);

  const stats: UserPolicyStats[] = userStats.map((user) => ({
    user: {
      id: user.id,
      name: user.name,
      image: user.image,
    },
    totalPolicies: user.organization?.OrganizationPolicy.length,
    publishedPolicies: user.organization?.OrganizationPolicy.filter(
      (policy) => policy.status === "published",
    ).length,
    draftPolicies: user.organization?.OrganizationPolicy.filter(
      (policy) => policy.status === "draft",
    ).length,
    archivedPolicies: user.organization?.OrganizationPolicy.filter(
      (policy) => policy.status === "archived",
    ).length,
    needsReviewPolicies: user.organization?.OrganizationPolicy.filter(
      (policy) => policy.status === "needs_review",
    ).length,
  }));

  stats.sort((a, b) => (b.totalPolicies ?? 0) - (a.totalPolicies ?? 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("policies.dashboard.policies_by_assignee")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {stats.map((stat) => (
            <div key={stat.user.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm">{stat.user.name || "Unknown User"}</p>
                <span className="text-sm text-muted-foreground">
                  {stat.totalPolicies} {t("policies.policies")}
                </span>
              </div>

              <RiskBarChart stat={stat} t={t} />

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="size-2 bg-primary" />
                  <span>
                    {t("common.status.published")} ({stat.publishedPolicies})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="size-2 bg-[var(--chart-open)]" />
                  <span>
                    {t("common.status.draft")} ({stat.draftPolicies})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="size-2 bg-[var(--chart-pending)]" />
                  <span>
                    {t("common.status.archived")} ({stat.archivedPolicies})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="size-2 bg-[hsl(var(--destructive))]" />
                  <span>
                    {t("common.status.needs_review")} (
                    {stat.needsReviewPolicies})
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RiskBarChart({ stat, t }: { stat: UserPolicyStats; t: any }) {
  const data = [
    ...(stat.publishedPolicies && stat.publishedPolicies > 0
      ? [
          {
            key: "published",
            value: stat.publishedPolicies,
            color: policyStatus.published,
            label: t("common.status.published"),
          },
        ]
      : []),
    ...(stat.draftPolicies && stat.draftPolicies > 0
      ? [
          {
            key: "draft",
            value: stat.draftPolicies,
            color: policyStatus.draft,
            label: t("common.status.draft"),
          },
        ]
      : []),
    ...(stat.archivedPolicies && stat.archivedPolicies > 0
      ? [
          {
            key: "archived",
            value: stat.archivedPolicies,
            color: policyStatus.archived,
            label: t("common.status.archived"),
          },
        ]
      : []),
  ];

  const gap = 0.3;
  const totalValue = stat.totalPolicies ?? 0;
  const barHeight = 12;
  const totalWidth = totalValue + gap * (data.length - 1);
  let cumulativeWidth = 0;
  const cornerRadius = 0;

  if (totalValue === 0) {
    return <div className="h-3 bg-muted" />;
  }

  return (
    <div
      className="relative h-[var(--height)]"
      style={
        {
          "--marginTop": "0px",
          "--marginRight": "0px",
          "--marginBottom": "0px",
          "--marginLeft": "0px",
          "--height": `${barHeight}px`,
        } as CSSProperties
      }
    >
      <div
        className="absolute inset-0
          h-[calc(100%-var(--marginTop)-var(--marginBottom))]
          w-[calc(100%-var(--marginLeft)-var(--marginRight))]
          translate-x-[var(--marginLeft)]
          translate-y-[var(--marginTop)]
          overflow-visible
        "
      >
        {data.map((d, index) => {
          const barWidth = (d.value / totalWidth) * 100;
          const xPosition = cumulativeWidth;
          cumulativeWidth += barWidth + gap;

          return (
            <div
              key={d.key}
              className="relative"
              style={{
                width: `${barWidth}%`,
                height: `${barHeight}px`,
                left: `${xPosition}%`,
                position: "absolute",
              }}
            >
              <div
                className={`bg-gradient-to-b ${d.color}`}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: `${cornerRadius}px`,
                }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const userData = unstable_cache(
  async (organizationId: string) => {
    return await db.user.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        name: true,
        image: true,
        organization: {
          select: {
            OrganizationPolicy: {
              select: {
                status: true,
              },
            },
          },
        },
      },
    });
  },
  ["users-policies-data-cache"],
  { revalidate: 3600 }, // Cache for 1 hour
);
