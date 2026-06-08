# Security Questionnaire Extension

Chrome MV3 extension for generating security questionnaire answers from Comp AI
and inserting them into third-party questionnaire pages.

## Current UX

- Popup: session status, active organization switcher, question detection toggle,
  and entry point to the review panel.
- Side panel: persistent questionnaire queue with generate, edit, approve, and
  insert actions.
- Content script: inline Comp buttons on generic web forms, Shadow DOM answer
  preview, page detection, and field insertion.
- Guardrails: first generate/insert per domain requires workspace confirmation;
  batch insert always asks for confirmation; switching organizations clears
  uninserted generated drafts and re-arms domain confirmation.

Google Docs and Google Sheets are detected as special surfaces. Google Sheets
supports mapped answer columns. When Google OAuth is configured, answers are
inserted directly through the Sheets API; otherwise the extension falls back to
a guided mapped paste flow.

## Local Development

1. Install dependencies from the repo root:

   ```bash
   bun install
   ```

2. Configure the extension:

   ```bash
   cp apps/browser-extension/security-questionnaire-ext/.env.example apps/browser-extension/security-questionnaire-ext/.env
   ```

   To enable direct Google Sheets insertion, set:

   ```text
   WXT_GOOGLE_OAUTH_CLIENT_ID=<chrome-extension-oauth-client-id>
   ```

   The OAuth client must be a Google Cloud OAuth client of type
   `Chrome extension`, created for the exact extension id. For local/staging,
   use `WXT_EXTENSION_KEY` so the unpacked extension id stays stable.

3. Add the unpacked extension origin to the API
   `COMP_EXTENSION_TRUSTED_ORIGINS`:

   ```text
   chrome-extension://<extension-id>
   ```

4. Build the static unpacked extension:

   ```bash
   bun run --filter '@trycompai/security-questionnaire-extension' build
   ```

5. Load the generated unpacked extension in Chrome:

   ```text
   apps/browser-extension/security-questionnaire-ext/dist/chrome-mv3
   ```

   The `dist/chrome-mv3-dev` directory is only for WXT dev-server sessions. It
   references `localhost:3100`, so the popup is blank when that server is not
   running.

The extension uses the existing Comp session flow and calls
`POST /v1/questionnaire/answer-single` without `questionnaireId` for webpage
questions, so generated answers are not persisted as questionnaire records.

## Configuration Model

Local development uses `apps/browser-extension/security-questionnaire-ext/.env`.
That file is ignored by git and is only for your local unpacked extension.

Production builds do not use the local `.env`. The release workflow injects the
production values from GitHub Actions:

```text
WXT_PUBLIC_API_BASE_URL=https://api.trycomp.ai
WXT_PUBLIC_APP_BASE_URL=https://app.trycomp.ai
WXT_GOOGLE_OAUTH_CLIENT_ID=<from GitHub secret>
```

The `WXT_PUBLIC_*` values and the Google OAuth client id are public build-time
configuration. They are expected to appear in the built extension. The real
secrets are the Chrome Web Store OAuth credentials and refresh token used by CI
to upload the package.

Before the published extension can authenticate against production, the API
production `COMP_EXTENSION_TRUSTED_ORIGINS` must include:

```text
chrome-extension://<SECURITY_QUESTIONNAIRE_EXTENSION_ID>
```

## Chrome Web Store Release

Publishing is handled by the `Security Questionnaire Extension Release`
workflow. It only runs on the `release` branch, which is the production branch,
and only when this extension or the workflow file changes.

The workflow:

- computes the next `security-questionnaire-ext-vX.Y.Z` tag,
- injects that version into the extension package before building,
- runs typecheck and tests,
- builds `dist/chrome-mv3` with production API/app URLs,
- uploads the ZIP to the existing Chrome Web Store item,
- calls the Chrome Web Store publish API, and
- creates the extension version tag after a successful publish.

Required GitHub secrets:

```text
CHROME_WEB_STORE_CLIENT_ID
CHROME_WEB_STORE_CLIENT_SECRET
CHROME_WEB_STORE_REFRESH_TOKEN
CHROME_WEB_STORE_PUBLISHER_ID
SECURITY_QUESTIONNAIRE_EXTENSION_ID
SECURITY_QUESTIONNAIRE_EXTENSION_GOOGLE_OAUTH_CLIENT_ID
```

The Chrome Web Store item must already exist and have its listing/privacy fields
ready in the Developer Dashboard. The workflow updates an existing item; it does
not create the first listing.

## Troubleshooting

- If Chrome reports `Extension context invalidated`, reload the affected browser
  tab after reloading the extension. Existing tabs can keep an old content script
  until the page is refreshed.
- If the console shows `ws://localhost:3100` or `[wxt] Failed to connect to dev
  server`, the loaded extension is `dist/chrome-mv3-dev`. Remove that unpacked
  extension, or run `bun run --filter '@trycompai/security-questionnaire-extension' dev`.
  For normal local testing, load `dist/chrome-mv3`.
- Chrome keeps previous entries on the extension Errors page. Clear them after
  reloading if you want to verify only new errors.
