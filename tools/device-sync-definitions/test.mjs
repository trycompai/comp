// Runs the Intune + JumpCloud device_sync definition tests offline against
// canned API responses. Run: node tools/device-sync-definitions/test.mjs
//
// Each provider's tests live in its own file (kept small per repo conventions);
// the shared mock harness is in harness.mjs.
//
// Imported SEQUENTIALLY via dynamic import: the test modules use top-level await
// and the mock stubs the global `fetch`, so they must run one-at-a-time —
// static imports would interleave their awaits and clobber each other's fetch.

await import('./intune.test.mjs');
await import('./jumpcloud.test.mjs');

const { report } = await import('./harness.mjs');
report();
