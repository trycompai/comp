# Native completion source identity

Native evidence can authorize automatic task completion only when its executing
runtime and the completion gate have the same verified source identity. This is
an input digest, not a control approval or a Git revision label.

`bun run build` compiles the package normally and records the actual API,
workspace-package, dependency-lock and build-configuration bytes before and after
compilation. Missing inputs, untracked runtime source or an incomplete checkout
produce an unknown identity. A compiler failure or input change invalidates the
identity. Development and source-based tests return unknown.

API builds and the Trigger build extension verify the recorded inputs again.
The package and API build tasks do not reuse Turbo's package-local build cache:
the identity also covers inputs in other packages. A stale recorded identity
fails verification and must be rebuilt. The production runtime and Node bundles
receive only the digest; the detailed input manifest stays in the build output.

The current API Dockerfile copies a partial checkout without Git metadata and
rewrites the root dependency manifest. That context cannot prove the complete
input identity and therefore remains unknown. Before enabling native automatic
completion from that build, the deployment owner must carry a manifest from the
complete checkout into both API and worker builds and verify every actual input,
including the frozen dependency lock. Do not relabel the partial context, copy
an identity from a different runtime or backfill historical runs. Evidence
collection may continue while completion remains blocked for human review.

Run `bun run test` and `bun run typecheck` in this package. The tests include
actual Node execution after TypeScript compilation and production bundling,
source and lock mutation, compiler failures, ignored source and missing checkout
metadata. No test connects to a live integration or changes a task status.
