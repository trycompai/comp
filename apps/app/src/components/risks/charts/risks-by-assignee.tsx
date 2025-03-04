import { getInitials } from "@/lib/utils";
import { getI18n } from "@/locales/server";
import { db } from "@bubba/db";
import { Avatar, AvatarFallback, AvatarImage } from "@bubba/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { ScrollArea } from "@bubba/ui/scroll-area";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

interface Props {
  organizationId: string;
}

interface UserRiskStats {
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  totalRisks: number;
  openRisks: number;
  pendingRisks: number;
  closedRisks: number;
  archivedRisks: number;
}

export async function RisksByAssignee({ organizationId }: Props) {
  const t = await getI18n();

  const userStats = await userData(organizationId);

  const stats: UserRiskStats[] = userStats.map((user) => ({
    user: {
      id: user.id,
      name: user.name,
      image: user.image,
    },
    totalRisks: user.Risk.length,
    openRisks: user.Risk.filter((risk) => risk.status === "open").length,
    pendingRisks: user.Risk.filter((risk) => risk.status === "pending").length,
    closedRisks: user.Risk.filter((risk) => risk.status === "closed").length,
    archivedRisks: user.Risk.filter((risk) => risk.status === "archived")
      .length,
  }));

  stats.sort((a, b) => b.totalRisks - a.totalRisks);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("risk.dashboard.risks_by_assignee")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea>
          <div className="space-y-4">
            {stats.map((stat) => (
              <Link
                href={`/risk/register?ownerId=${stat.user.id}`}
                key={stat.user.id}
              >
                <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50">
                  <Avatar>
                    <AvatarImage src={stat.user.image || undefined} />
                    <AvatarFallback>
                      {getInitials(stat.user.name || "Unknown User")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none truncate">
                        {stat.user.name || "Unknown User"}
                      </p>
                      <span className="text-sm text-muted-foreground">
                        {stat.totalRisks} {t("risk.risks")}
                      </span>
                    </div>

                    <div className="mt-2 w-full bg-muted rounded-full h-2 overflow-hidden">
                      {stat.totalRisks > 0 && (
                        <div className="h-full flex">
                          {stat.openRisks > 0 && (
                            <div
                              className="bg-yellow-500 h-full"
                              style={{
                                width: `${(stat.openRisks / stat.totalRisks) * 100}%`,
                              }}
                              title={`${t("common.status.open")}: ${stat.openRisks}`}
                            />
                          )}
                          {stat.pendingRisks > 0 && (
                            <div
                              className="bg-blue-500 h-full"
                              style={{
                                width: `${
                                  (stat.pendingRisks / stat.totalRisks) * 100
                                }%`,
                              }}
                              title={`${t("common.status.pending")}: ${stat.pendingRisks}`}
                            />
                          )}
                          {stat.closedRisks > 0 && (
                            <div
                              className="bg-green-500 h-full"
                              style={{
                                width: `${(stat.closedRisks / stat.totalRisks) * 100}%`,
                              }}
                              title={`${t("common.status.closed")}: ${stat.closedRisks}`}
                            />
                          )}
                          {stat.archivedRisks > 0 && (
                            <div
                              className="bg-gray-500 h-full"
                              style={{
                                width: `${(stat.archivedRisks / stat.totalRisks) * 100}%`,
                              }}
                              title={`${t("common.status.archived")}: ${stat.archivedRisks}`}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-1.5 hidden lg:flex items-center gap-3 text-xs text-muted-foreground">
                      {stat.openRisks > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="size-2 rounded-full bg-yellow-500" />
                          <span>
                            {t("common.status.open")} ({stat.openRisks})
                          </span>
                        </div>
                      )}
                      {stat.pendingRisks > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="size-2 rounded-full bg-blue-500" />
                          <span>
                            {t("common.status.pending")} ({stat.pendingRisks})
                          </span>
                        </div>
                      )}
                      {stat.closedRisks > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="size-2 rounded-full bg-green-500" />
                          <span>
                            {t("common.status.closed")} ({stat.closedRisks})
                          </span>
                        </div>
                      )}
                      {stat.archivedRisks > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="size-2 rounded-full bg-gray-500" />
                          <span>
                            {t("common.status.archived")} ({stat.archivedRisks})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

const userData = unstable_cache(
  async (organizationId: string) => {
    return await db.user.findMany({
      where: {
        organizationId,
        Risk: {
          some: {},
        },
      },
      select: {
        id: true,
        name: true,
        image: true,
        Risk: {
          select: {
            status: true,
          },
        },
      },
    });
  },
  ["users-with-risks"],
  { tags: ["risks", "users"] },
);
