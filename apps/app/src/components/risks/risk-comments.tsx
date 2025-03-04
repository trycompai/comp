"use client";

import { AssignedUser } from "@/components/assigned-user";
import { useI18n } from "@/locales/client";
import type { Risk, RiskComment, User } from "@bubba/db";
import { Badge } from "@bubba/ui/badge";
import { Button } from "@bubba/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { EmptyCard } from "@bubba/ui/empty-card";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";
import { useQueryState } from "nuqs";
import { RiskCommentSheet } from "../sheets/risk-comment-sheet";

export function RiskComments({
  risk,
  users,
}: {
  risk: Risk & { comments: RiskComment[] };
  users: User[];
}) {
  const [open, setOpen] = useQueryState("risk-comment-sheet");
  const t = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {t("common.comments.title")}
            </div>
            <Button variant="action" onClick={() => setOpen("true")}>
              <MessageSquare className="h-4 w-4" />
              {t("common.comments.add")}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {risk.comments.length > 0 ? (
          <div className="flex flex-col gap-4">
            {risk.comments.map((comment) => {
              const commentUser = users.find(
                (user) => user.id === comment.ownerId,
              );
              return (
                <div
                  key={comment.id}
                  className="group relative flex flex-col gap-3 border bg-card p-4 shadow-sm transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-card-foreground whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <AssignedUser
                      fullName={commentUser?.name}
                      avatarUrl={commentUser?.image}
                      date={format(comment.createdAt, "MMM d yyyy, h:mm a")}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyCard
            title={t("common.comments.empty.title")}
            icon={MessageSquare}
            description={t("common.comments.empty.description")}
            className="w-full"
          />
        )}
      </CardContent>

      <RiskCommentSheet risk={risk} />
    </Card>
  );
}
