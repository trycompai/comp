---
name: api-endpoint-contract
description: The contract every new or modified API endpoint must follow so it is correct for the public OpenAPI spec, the MCP server (npm @trycompai/mcp-server), the ValidationPipe, and the docs. Triggers on "new endpoint", "add API", "new DTO", "@Body", "@RequirePermission", "MCP tool", "edit controller in apps/api", "OpenAPI", or whenever editing controllers under apps/api/src/.
---

# API Endpoint Contract (MCP-friendly NestJS endpoints)

Every customer-facing endpoint in `apps/api/src/` ends up in three places:

1. **The OpenAPI spec** (`packages/docs/openapi.json`) — regenerated on every dev boot, consumed by Speakeasy.
2. **The MCP server** (`apps/mcp-server/`, published as `@trycompai/mcp-server` on npm) — generated daily from the OpenAPI spec.
3. **The runtime ValidationPipe** — accepts/rejects request bodies based on class-validator metadata.

If any one of these three is wrong, the endpoint either silently breaks for agents (Claude Desktop, Cursor, Codex, etc.) or fails validation at runtime. **Follow this contract on every body-accepting endpoint.**

## The 11 rules

### 1. DTOs MUST be classes — never interfaces, never inline types

```ts
// ❌ erased at runtime → empty MCP schema → agents blind-guess the body
interface CreateConnectionDto {
  providerSlug: string;
  credentials?: Record<string, string | string[]>;
}

// ❌ same problem
async updateConnection(@Body() body: { metadata?: Record<string, unknown> }) { ... }

// ✅ class — survives to runtime, @nestjs/swagger can introspect it
class CreateConnectionDto {
  @ApiProperty({ description: '...', example: 'aws' })
  @IsString()
  providerSlug!: string;
}
```

### 2. Every DTO property carries BOTH decorator stacks

The global `ValidationPipe` runs with `whitelist: true, forbidNonWhitelisted: true`. A class with `@ApiProperty` but no `class-validator` decorator has **zero "known" properties** — the pipe rejects every field with *"property X should not exist"*. The reverse (class-validator without `@ApiProperty`) generates an **empty MCP schema** and agents blind-guess the body.

```ts
class FooDto {
  // ✅ both stacks
  @ApiProperty({ description: 'Name', example: 'foo' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Optional tag', example: 'beta' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiProperty({ type: 'array', items: { type: 'string' } })
  @IsArray()
  @IsString({ each: true })
  services!: string[];
}
```

### 3. Add `@ApiBody({ type: DtoClass })` on the endpoint

`@nestjs/swagger` does NOT reliably infer the body type from `@Body() body: DtoClass` alone. Always declare it explicitly so the OpenAPI `requestBody.content.application/json.schema.$ref` resolves correctly.

```ts
@Post()
@RequirePermission('integration', 'create')
@ApiOperation({ summary: 'Create an integration connection' })
@ApiBody({ type: CreateConnectionDto })
async createConnection(
  @Body() body: CreateConnectionDto,
  @OrganizationId() organizationId: string,
) { ... }
```

### 4. Operation descriptions ≤ 240 characters

`apps/api/src/openapi/seo-text.ts:71` (`toOperationDescription`) trims every `@ApiOperation.description` to **240 chars at a word boundary** for SEO/docs consistency. Anything longer gets cut mid-sentence and the trailing words are stripped — **including the actionable step at the end of your description**. Count chars; keep the key instruction in the first 240.

### 5. Use a clean MCP tool name when the auto-derived one is ugly

Tool names are auto-derived from controller method names by `applyMcpToolNames` in `apps/api/src/openapi/public-docs-metadata.ts`. If the auto-name is generic or ugly, override:

```ts
@Post(':id/auto-answer')
@ApiExtension('x-speakeasy-mcp', { name: 'generate-questionnaire-answers' })
async triggerAutoAnswer(@Param('id') id: string) { ... }
```

Tool name budget: **52 chars max**, kebab-case.

### 6. Agent-callable endpoints must NOT be behind `SessionOnlyGuard`

If your endpoint uses `@UseGuards(HybridAuthGuard, SessionOnlyGuard, PermissionGuard)`, API-key callers get a 403 — meaning the MCP tool exists but fails for every customer call. Either:
- Remove `SessionOnlyGuard` if the endpoint should be agent-callable, OR
- Disable the MCP tool entirely in `apps/mcp-server/.speakeasy/mcp-uploads-overlay.yaml` with `x-speakeasy-mcp: { disabled: true }`.

### 7. Long-running operations: async + poll, never sync wait

Anything taking > ~30s should not block on a single tool call. Return a run handle and let the agent poll:

```ts
// Trigger: returns immediately
@Post(':id/auto-answer')
async triggerAutoAnswer(@Param('id') id: string): Promise<TriggerResponseDto> {
  const handle = await tasks.trigger('auto-answer-task', { id, ... });
  return { runId: handle.id, status: 'generating', totalQuestions, answeredQuestions };
}

// Agent polls find-by-id until counts converge
```

The `@ApiOperation.description` should tell the agent the poll target (e.g. *"Poll GET /v1/X/:id until answeredQuestions equals totalQuestions"*).

### 8. File uploads from agents: presigned URL + s3Key — never inline base64

Base64-through-LLM is catastrophically slow and overflows the context window. For any endpoint that needs file bytes:

```ts
// Endpoint accepts both for the web UI (fileData) and agents (s3Key):
class UploadAndParseDto {
  @ApiPropertyOptional({ description: 'Base64 — web UI only. AI clients use s3Key.' })
  @IsOptional() @IsString()
  fileData?: string;

  @ApiPropertyOptional({ description: 'Key returned by /v1/uploads/presign.' })
  @IsOptional() @IsString()
  s3Key?: string;
}

// Service resolves whichever was provided:
const bytes = dto.fileData
  ?? (dto.s3Key ? await uploadsService.readUploadAsBase64(orgId, dto.s3Key) : null);
```

The MCP overlay then strips `fileData` from the MCP tool input so agents are forced into the presigned path. Pattern is in `apps/mcp-server/.speakeasy/mcp-uploads-overlay.yaml`.

### 9. Sensitive endpoints are deny-listed from public docs — don't fight it

`apps/api/src/openapi/public-docs-quality.ts` strips paths matching `/\/credentials(?:\/|$)/` and similar from `packages/docs/openapi.json`. Endpoints for rotating credentials, raw secrets, etc. **intentionally do not appear in MCP**. Add new sensitive paths to that deny-list if they handle secrets.

### 10. MCP-incompatible response shapes: disable the MCP tool in the overlay

SSE streams (`@ApiProduces('text/event-stream')`) and binary file responses (`@Res() res.send(buffer)`) cannot be consumed by a single JSON-RPC tool call. Disable them for MCP only (HTTP endpoint stays for the web UI):

```yaml
# apps/mcp-server/.speakeasy/mcp-uploads-overlay.yaml
- target: "$.paths['/v1/questionnaire/auto-answer'].post"
  update:
    x-speakeasy-mcp:
      disabled: true
```

### 11. Every endpoint MUST have a meaningful summary + description — it powers MCP discovery

`@ApiOperation({ summary, description })` is **not optional**. `openapi-docs.spec.ts` (via `collectPublicOpenApiIssues` in `apps/api/src/openapi/public-docs-quality.ts`) **fails CI** if any non-excluded operation has:
- an empty `summary` → `missingSummaries`
- a missing `description` or SEO metadata → `missingMetadata`
- SEO metadata outside 80–160 chars, or a title > 60 chars → `invalidSeo`

This matters more now that the hosted MCP (Gram) uses **dynamic toolsets**: with 300+ tools the agent never sees them all — it runs a semantic `search` over tool **names + descriptions** and only loads matches. A tool with a weak or missing description is effectively **undiscoverable**. The description is the tool's only chance of being found.

```ts
@ApiOperation({
  summary: 'List compliance policies', // concise tool title
  description:
    "Returns the organization's compliance policies (SOC 2, ISO 27001, …) " +
    'with status and owner. Use to review or audit policy coverage.', // what it does + when to use it
})
```

Write the description for the agent deciding *whether to call this tool*: state what it does and when to use it. (Keep it ≤ 240 chars — see Rule 4.)

## Workflow checklist when adding a body endpoint

1. Define a `class` DTO. Two decorator stacks on every field. Add `@ApiBody({ type: DtoClass })` on the endpoint.
2. Give the endpoint a meaningful `@ApiOperation({ summary, description })` — both required, CI-enforced by `openapi-docs.spec.ts`, and they power MCP dynamic-toolset discovery (Rule 11). Keep the description ≤ 240 chars (Rule 4).
3. If the auto-derived MCP tool name is ugly, set `@ApiExtension('x-speakeasy-mcp', { name: '...' })`.
4. If the endpoint requires session auth, decide: remove `SessionOnlyGuard`, or disable it for MCP via the overlay.
5. For long-running work, return a run handle and document the poll target.
6. For file uploads, accept `s3Key` and read via `UploadsService.readUploadAsBase64`.
7. **`bun run --filter '@trycompai/api' dev`** — your dev server regenerates `packages/docs/openapi.json` on boot.
8. **`git add packages/docs/openapi.json`** — commit the regenerated spec alongside your API change. The daily Speakeasy CI reads from this file; if it's stale, your new tool never reaches customers.
9. Sanity-check the new operation in the spec:
   ```
   node -e 'const o=require("./packages/docs/openapi.json"); console.log(o.paths["/v1/your-path"]?.post?.requestBody?.content?.["application/json"]?.schema)'
   ```
   If the schema is `undefined` or has empty `properties`, **stop** — fix the DTO before merging.

## Why this matters

Every bug below was a real customer-visible MCP failure caught during the May 2026 audit:

| Bug | Root cause | Rule that prevents it |
|---|---|---|
| PDF upload crashed with `Cannot read properties of undefined (reading 'replace')` | Inline `@Body()` type → empty schema → agent guessed wrong body | Rule 1 + 3 |
| Auto-answer "schema is just an empty object" | DTO had class-validator only, no `@ApiProperty` | Rule 2 |
| `create-connection` "Provider undefined not found" | DTO was an `interface`, not a class | Rule 1 |
| `create-connection` "property X should not exist" 400 | Class converted, but I forgot class-validator decorators | Rule 2 |
| `create-upload-url` description cut at "...then." | Description was 330 chars; `seo-text.ts` truncates at 240 | Rule 4 |
| Agent uploads stuck for 15+ min on base64 encoding | Tool accepted `fileData` as the only file input | Rule 8 |
| Agent calls SSE auto-answer and hangs | Tool was generated from `@ApiProduces('text/event-stream')` | Rule 10 |
| Agent tries to start OAuth and gets 403 | Endpoint was behind `SessionOnlyGuard` but generated as MCP tool | Rule 6 |
| Agent can't find a tool that exists (dynamic toolsets) | Endpoint had a missing/weak description → invisible to semantic search | Rule 11 |

Follow the 10 rules and you avoid every one of these.
