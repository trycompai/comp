-- CreateTable
CREATE TABLE "public"."secrets" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('sec'::text),
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secrets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "secrets_organization_id_name_key" ON "public"."secrets"("organization_id", "name");

-- AddForeignKey
ALTER TABLE "public"."secrets" ADD CONSTRAINT "secrets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
