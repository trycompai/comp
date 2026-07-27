-- Invited employees (people-invite / add-employee flows) were created with
-- "emailVerified" = false. better-auth refuses to link a trusted OAuth provider
-- (Google/Microsoft) sign-in to an existing unverified user (account_not_linked),
-- so those employees could not sign in with SSO. New employee rows are now
-- created with "emailVerified" = true; this backfills existing org members so
-- they can sign in too.
--
-- Safe because password auth is disabled: every sign-in method (email OTP,
-- magic link, trusted OAuth) proves control of the mailbox before a session is
-- issued, so the flag grants nothing to anyone who cannot already receive mail
-- at the address.
UPDATE "User"
SET "emailVerified" = true,
    "updatedAt" = NOW()
WHERE "emailVerified" = false
  AND EXISTS (
    SELECT 1 FROM "Member" m WHERE m."userId" = "User".id
  );
