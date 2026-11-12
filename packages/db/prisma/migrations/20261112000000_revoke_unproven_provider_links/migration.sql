-- Security fix (CWE-287): revoke provider links that were never proven to belong
-- to the account whose user they sign in as.
--
-- Before this change, better-auth's `handleOAuthUserInfo` (oauth2/link-account)
-- signed a returning OAuth user in by `(providerId, accountId)` alone — with no
-- check of the provider's email or of `emailVerified`. Its email/verified checks
-- only gate NEW links. Google and GitHub links created while those providers were
-- trusted for email-based linking (TRUSTED_LINKING_PROVIDERS, emptied in #3618),
-- and Microsoft links created before #3600, could therefore sign in as a user
-- whose address the provider never proved.
--
-- Sign-in now refuses any link whose provider does not assert a verified email
-- matching the linked user's email (apps/api/src/auth/provider-sign-in-policy.ts),
-- so those rows are dead weight and a latent risk. A sign-up creates the User and
-- its Account in the same request; an Account created more than a minute after its
-- User was linked to an existing account later. Delete those links, and log the
-- affected users out once so a live cookie cannot keep using the link.
--
-- Users can simply sign in again: their next verified sign-in re-creates the
-- Account row through the normal linking flow.
--
-- Not touched: User, Member, OauthConsent, API keys, password (credential)
-- accounts and every non-social provider. No date cutoff: self-hosted installs
-- upgrade on their own schedule, so a merge-date boundary would be wrong for them.

BEGIN;

CREATE TEMP TABLE "revoked_provider_link_user" ON COMMIT DROP AS
SELECT DISTINCT account."userId"
FROM "Account" AS account
JOIN "User" AS "user" ON "user"."id" = account."userId"
WHERE account."providerId" IN ('google', 'github', 'microsoft')
  AND account."createdAt" > "user"."createdAt" + interval '1 minute';

DELETE FROM "Account" AS account
USING "User" AS "user", "revoked_provider_link_user" AS revoked
WHERE "user"."id" = account."userId"
  AND revoked."userId" = account."userId"
  AND account."providerId" IN ('google', 'github', 'microsoft')
  AND account."createdAt" > "user"."createdAt" + interval '1 minute';

DELETE FROM "Session"
WHERE "userId" IN (SELECT "userId" FROM "revoked_provider_link_user");

DELETE FROM "oauth_access_token"
WHERE "userId" IN (SELECT "userId" FROM "revoked_provider_link_user");

COMMIT;
