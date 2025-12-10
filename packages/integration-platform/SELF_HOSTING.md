# Self-Hosting: OAuth Configuration

Quick guide for platform admins self-hosting the application.

## Overview

OAuth integrations (GitHub, Google Workspace, GCP, etc.) require **platform-level OAuth credentials**. You create one OAuth app per provider, and all your users share it.

**You configure once → Users connect easily**

## Quick Setup Flow

1. Create OAuth app with the provider
2. Get Client ID and Client Secret
3. Add them in Admin UI (`/admin/integrations`)
4. Users can now connect via OAuth

---

## Provider Setup

### GitHub

**Time: 5 minutes**

1. Go to https://github.com/settings/developers
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: `Comp AI` (or your deployment name)
   - **Homepage URL**: `https://yourapp.com`
   - **Authorization callback URL**: `https://yourapp.com/v1/integrations/oauth/callback`
4. Click **Register application**
5. Copy **Client ID**
6. Click **Generate a new client secret** → Copy it

**Add to platform:**
- Go to `/admin/integrations` in your deployment
- Find **GitHub** → Click **Configure**
- Paste Client ID and Client Secret → Save

✅ Users can now connect GitHub!

---

### Google Workspace & GCP (Shared Setup)

**Time: 10 minutes**

**Tip:** Both integrations can use the **same OAuth app**.

1. Go to https://console.cloud.google.com
2. Create or select a project
3. **OAuth Consent Screen:**
   - Go to **APIs & Services** → **OAuth consent screen**
   - Select **Internal** (if you're using Google Workspace) or **External**
   - Fill in app name, support email, etc.
   - Add scopes (the platform will request them dynamically)
   - Save

4. **Create Credentials:**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Select **Web application**
   - Name: `Comp AI`
   - **Authorized redirect URIs**: `https://yourapp.com/v1/integrations/oauth/callback`
   - Create → Copy **Client ID** and **Client Secret**

5. **Enable Required APIs:**
   - Admin SDK API (for Google Workspace)
   - Cloud Resource Manager API (for GCP)
   - Security Command Center API (for GCP)

**Add to platform:**

**For Google Workspace:**
- Go to `/admin/integrations`
- Find **Google Workspace** → **Configure**
- Paste Client ID and Client Secret → Save

**For GCP (use same credentials):**
- Find **Google Cloud Platform** → **Configure**
- Paste the **same** Client ID and Client Secret → Save

✅ Users can now connect both integrations with one OAuth app!

---

### Linear

**Time: 5 minutes**

1. Go to https://linear.app/settings/api
2. Click **Create new OAuth application**
3. Fill in:
   - **Name**: `Comp AI`
   - **Callback URLs**: `https://yourapp.com/v1/integrations/oauth/callback`
4. Create → Copy **Client ID** and **Client Secret**

**Add to platform:**
- Go to `/admin/integrations`
- Find **Linear** → **Configure**
- Paste Client ID and Client Secret → Save

---

### Vercel

**Time: 5 minutes**

1. Go to https://vercel.com/dashboard/integrations/console
2. Click **Create Integration**
3. Fill in:
   - **Name**: `Comp AI`
   - **Redirect URL**: `https://yourapp.com/v1/integrations/oauth/callback`
4. Create → Copy **Client ID**, **Client Secret**, and **Integration Slug**

**Add to platform:**
- Go to `/admin/integrations`
- Find **Vercel** → **Configure**
- Paste Client ID and Client Secret
- In **Custom Settings** → add **Integration Slug**
- Save

---

### Rippling

**Time: 15-30 minutes (requires Rippling approval)**

1. Contact Rippling support to create a marketplace integration
2. Provide your callback URL: `https://yourapp.com/v1/integrations/oauth/callback`
3. Wait for Rippling to approve and provide:
   - Client ID
   - Client Secret
   - App Name (your Rippling app identifier)

**Add to platform:**
- Go to `/admin/integrations`
- Find **Rippling** → **Configure**
- Paste Client ID and Client Secret
- In **Custom Settings** → add **App Name**
- Save

---

## Non-OAuth Integrations

These don't require platform setup - users provide their own credentials:

### AWS
- **Auth**: IAM Role (users create their own role)
- **No platform setup needed**

### Azure
- **Auth**: Service Principal (users create their own)
- **No platform setup needed**

---

## Troubleshooting

### "Coming Soon" Button Shows

**Problem:** Integration shows "Coming Soon" instead of "Connect"

**Solution:** OAuth credentials not configured. Go to `/admin/integrations` and configure Client ID/Secret for that provider.

---

### OAuth Callback Fails

**Problem:** Users get redirected to an error page after OAuth

**Possible causes:**
1. **Callback URL mismatch**: Make sure the redirect URI in the OAuth app matches your deployment URL exactly
2. **Wrong client secret**: Double-check you copied the secret correctly
3. **API not enabled**: Some providers require enabling APIs (Google Workspace, GCP)

**Debug:**
Check API logs for the OAuth callback error message.

---

### Users See "Unverified App" Warning (Google)

**Problem:** Google shows a warning screen during OAuth

**This is normal** for:
- Development/testing
- Before Google verification

**For production:**
Submit your app for Google's verification process. Required for the `cloud-platform` scope (GCP integration).

**For testing:**
Users can click **Advanced** → **Go to [app name] (unsafe)** to proceed.

---

## Security Best Practices

### Protect OAuth Credentials

- ✅ Credentials are encrypted at rest in the database
- ✅ Never commit credentials to git
- ✅ Use environment variables for sensitive config (though OAuth credentials are in DB)
- ✅ Rotate credentials if compromised

### Principle of Least Privilege

OAuth credentials grant broad access, but:
- We only request the minimum scopes needed
- Checks only perform read operations
- User IAM roles further limit actual access

### Callback URL

Always use **HTTPS** in production:
- ✅ `https://yourapp.com/v1/integrations/oauth/callback`
- ❌ `http://yourapp.com/...` (insecure)

For local dev:
- `http://localhost:3000/v1/integrations/oauth/callback` is fine

---

## Summary

**Platform Admin (you) does:**
1. Create OAuth apps with each provider (one-time, ~5-10 min each)
2. Add Client ID/Secret to `/admin/integrations`
3. That's it!

**End Users do:**
1. Click "Connect"
2. Sign in with their account
3. Done!

**No environment variables, no secret management, no complexity.** All credentials are encrypted in the database and managed via the admin UI.

