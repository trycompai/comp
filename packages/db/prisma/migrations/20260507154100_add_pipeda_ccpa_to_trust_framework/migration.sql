-- Add PIPEDA and CCPA certificate support to TrustResource framework enum.
ALTER TYPE "TrustFramework" ADD VALUE IF NOT EXISTS 'pipeda';
ALTER TYPE "TrustFramework" ADD VALUE IF NOT EXISTS 'ccpa';
