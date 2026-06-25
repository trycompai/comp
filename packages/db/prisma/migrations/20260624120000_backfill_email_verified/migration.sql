-- Backfill emailVerified for all existing accounts so the new email-verification
-- requirement (emailAndPassword.requireEmailVerification) does not block any
-- current user from signing in. OAuth / magic-link / OTP users are already
-- verified; this covers the rest.
--
-- DEPLOY ORDER: remove the spoofed test accounts (credential accounts created
-- on/after 2026-06-23) BEFORE this runs in production — otherwise they would
-- also be marked verified and regain the ability to sign in.

UPDATE "User"
SET "emailVerified" = true
WHERE "emailVerified" = false;
