-- CreateTable
CREATE TABLE "mcp_org_binding" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('mob'::text),
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_org_binding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mcp_org_binding_userId_key" ON "mcp_org_binding"("userId");

-- CreateIndex
CREATE INDEX "mcp_org_binding_organizationId_idx" ON "mcp_org_binding"("organizationId");

-- AddForeignKey
ALTER TABLE "mcp_org_binding" ADD CONSTRAINT "mcp_org_binding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_org_binding" ADD CONSTRAINT "mcp_org_binding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
