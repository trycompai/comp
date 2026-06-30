# device-sync-definitions

Version-controlled `deviceSyncDefinition` DSL for dynamic (DB-backed) integrations,
plus an apply script and an offline test harness.

## Why this exists

Device sync for a dynamic integration is a `deviceSyncDefinition` (a DSL with
`code` steps) stored on the integration's row **in the database**, authored via
the internal API. The public `integrations-catalog/` is an export-only mirror
that **strips** sync DSL, so without this folder these definitions would be
un-versioned and unrecoverable. Keep the source of truth here; apply it to the DB.

> Code-manifest integrations (google-workspace, rippling, aws, azure, gcp,
> github, vercel, aikido) are **not** authored this way — they live in
> `packages/integration-platform/src/manifests/`. The device-sync execution path
> currently requires a DB `deviceSyncDefinition`, so this tool only targets
> dynamic integrations (e.g. intune, jumpcloud).

## Contract

Each code step must populate `scope.devices` with `SyncDevice` objects
(`packages/integration-platform/src/dsl/types.ts`):

- required: `name`, `platform` (`macos|windows|linux`), `userEmail`, `status` (`active|inactive`)
- optional: `serialNumber`, `externalId`, `hostname`, `osVersion`, `hardwareModel`

The import (`GenericDeviceSyncService`) matches each device to a member by
lowercased `userEmail`; a device with no resolvable email is silently skipped.
`isDirectorySource` stays `false` (import-only; never deletes).

## Test (offline, no token needed)

```bash
node tools/device-sync-definitions/test.mjs
```

Runs each `code` string exactly as the interpreter does against canned API
responses and validates the output against the SyncDevice contract.

## Apply (needs the internal token)

Same env-var convention as `tools/integrations-catalog-sync`.

```bash
export COMPAI_INTERNAL_API_BASE="https://api.staging.trycomp.ai/v1/internal"
export COMPAI_INTERNAL_TOKEN="<token>"

# dry run — prints the plan, writes nothing
node tools/device-sync-definitions/apply.mjs intune

# apply for real (re-sends existing checks verbatim, adds device_sync + the definition)
node tools/device-sync-definitions/apply.mjs intune --yes
```

Run against **staging** first, connect the provider, set it as the org's device
sync provider (People → Devices), Sync now, and confirm rows appear. Then prod.

The selector and daily scheduler pick up the new `device_sync` capability within
~60s (registry refresh).
