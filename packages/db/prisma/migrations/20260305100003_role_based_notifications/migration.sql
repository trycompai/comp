-- CreateTable
CREATE TABLE "role_notification_setting" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('rns'::text),
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "policyNotifications" BOOLEAN NOT NULL DEFAULT true,
    "taskReminders" BOOLEAN NOT NULL DEFAULT true,
    "taskAssignments" BOOLEAN NOT NULL DEFAULT true,
    "taskMentions" BOOLEAN NOT NULL DEFAULT true,
    "weeklyTaskDigest" BOOLEAN NOT NULL DEFAULT true,
    "findingNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_notification_setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_notification_setting_organizationId_role_key" ON "role_notification_setting"("organizationId", "role");

-- AddForeignKey
ALTER TABLE "role_notification_setting" ADD CONSTRAINT "role_notification_setting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
