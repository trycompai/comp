import { AssignedUser } from "@/components/assigned-user";
import { UploadDialog } from "@/components/upload-dialog";
import { getI18n } from "@/locales/server";
import type { RiskMitigationTask, TaskAttachment, User } from "@bubba/db";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { EmptyCard } from "@bubba/ui/empty-card";
import { format } from "date-fns";
import Link from "next/link";

export async function TaskAttachments({
  task,
  users,
  signedUrls,
}: {
  task: RiskMitigationTask & { TaskAttachment: TaskAttachment[] };
  users: User[];
  signedUrls: { signedUrl: string }[];
}) {
  const t = await getI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center justify-between gap-2">
            {t("risk.tasks.attachments")}
            <UploadDialog taskId={task.id} riskId={task.riskId} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {task.TaskAttachment.length > 0 ? (
          <div className="flex flex-col gap-2">
            {task.TaskAttachment.map((attachment, index) => (
              <div
                key={attachment.id}
                className="flex flex-col gap-2 border p-4"
              >
                <div className="flex items-center gap-2">
                  <Link
                    href={signedUrls[index].signedUrl}
                    target="_blank"
                    className="hover:underline"
                  >
                    {attachment.name}
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <AssignedUser
                      fullName={
                        users.find((user) => user.id === attachment.ownerId)
                          ?.name
                      }
                      avatarUrl={
                        users.find((user) => user.id === attachment.ownerId)
                          ?.image
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      ({format(attachment.uploadedAt, "MMM dd, yyyy, h:mm a")})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyCard
            title={t("common.attachments.empty.title")}
            description={t("common.attachments.empty.description")}
            className="w-full"
          />
        )}
      </CardContent>
    </Card>
  );
}
