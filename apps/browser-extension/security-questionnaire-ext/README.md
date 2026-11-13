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

This repository does not publish the extension. To use it with a self-hosted
instance, build it with your own values and load or publish the build yourself:

```text
WXT_PUBLIC_API_BASE_URL=<your API URL>
WXT_PUBLIC_APP_BASE_URL=<your app URL>
WXT_GOOGLE_OAUTH_CLIENT_ID=<optional, enables direct Google Sheets insertion>
```

The `WXT_PUBLIC_*` values and the Google OAuth client id are public build-time
configuration. They are expected to appear in the built extension.

Before the extension can authenticate against your API, the API's
`COMP_EXTENSION_TRUSTED_ORIGINS` must include:

```text
chrome-extension://<your extension id>
```

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
