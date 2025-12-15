-- CreateTable
CREATE TABLE "public"."BrowserbaseContext" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('bbc'::text),
    "connectionId" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "authenticatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrowserbaseContext_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrowserbaseContext_connectionId_key" ON "public"."BrowserbaseContext"("connectionId");

-- CreateIndex
CREATE INDEX "BrowserbaseContext_connectionId_idx" ON "public"."BrowserbaseContext"("connectionId");

-- AddForeignKey
ALTER TABLE "public"."BrowserbaseContext" ADD CONSTRAINT "BrowserbaseContext_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
