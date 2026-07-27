-- Persist the outcome of the last connect/sign-in attempt on a browser
-- connection so a "can't connect" support ticket can be diagnosed from the row
-- alone, without digging through ephemeral run logs. All nullable / additive.
ALTER TABLE "BrowserAuthProfile" ADD COLUMN "lastSignInOutcome" TEXT;
ALTER TABLE "BrowserAuthProfile" ADD COLUMN "lastSignInDetail" TEXT;
ALTER TABLE "BrowserAuthProfile" ADD COLUMN "lastSignInAt" TIMESTAMP(3);
