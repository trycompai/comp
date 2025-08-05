-- CreateTable
CREATE TABLE "public"."jwks" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('jwk'::text),
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jwks_pkey" PRIMARY KEY ("id")
);
