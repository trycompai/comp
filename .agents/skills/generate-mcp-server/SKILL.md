---
name: generate-mcp-server
description: Use when generating an MCP server from an OpenAPI spec with Speakeasy. Triggers on "generate MCP server", "MCP server", "Model Context Protocol", "AI assistant tools", "Claude tools", "speakeasy MCP", "mcp-typescript"
license: Apache-2.0
---

# generate-mcp-server

Generate a Model Context Protocol (MCP) server from an OpenAPI spec using Speakeasy. The MCP server exposes API operations as tools that AI assistants like Claude can call directly.

## When to Use

- User wants to create an MCP server from their API
- User asks about Model Context Protocol integration
- User wants AI assistants to interact with their API
- User says: "generate MCP server", "create MCP server", "speakeasy MCP"
- User asks: "How do I make my API available to Claude?"
- User mentions: "mcp-typescript", "AI assistant tools", "Claude tools"

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| OpenAPI spec | Yes | Path or URL to the OpenAPI specification |
| Package name | Yes | npm package name for the MCP server (e.g., `my-api-mcp`) |
| Auth method | Yes | How the API authenticates (bearer token, API key, etc.) |
| Env var prefix | No | Prefix for environment variables (e.g., `MYAPI`) |
| Scope strategy | No | How to map operations to scopes (default: read/write by HTTP method) |

## Outputs

| Output | Description |
|--------|-------------|
| MCP server | TypeScript MCP server with one tool per API operation |
| CLI entry point | Command-line interface with stdio and SSE transports |
| Scope definitions | Scope-based access control for filtering tools |
| Docker support | Dockerfile and compose config for containerized deployment |
| Workflow config | `.speakeasy/workflow.yaml` configured for MCP generation |

## Prerequisites

1. Speakeasy CLI installed and authenticated:
```bash
speakeasy auth login
# Or for CI/AI agents:
export SPEAKEASY_API_KEY="<your-api-key>"
```

2. Node.js 20+ installed (for the generated MCP server).

3. A valid OpenAPI spec (3.0 or 3.1). Validate first:
```bash
speakeasy lint openapi --non-interactive -s ./openapi.yaml
```

Run `speakeasy auth login` to authenticate interactively, or set the `SPEAKEASY_API_KEY` environment variable.

## Command

The generation uses `speakeasy run` after configuring the workflow, overlays, and gen.yaml. There is no single command -- follow the step-by-step workflow below.

```bash
# After all config files are in place:
speakeasy run
```

## Step-by-Step Workflow

### Step 1: Create the Scopes Overlay

Create `mcp-scopes-overlay.yaml` in the project root. This controls which API operations become MCP tools and what scopes they require:

```yaml
# mcp-scopes-overlay.yaml
openapi: 3.1.0
overlay: 1.0.0
info:
  title: Add MCP scopes
  version: 0.0.0
actions:
  # Enable read operations
  - target: $.paths.*["get","head"]
    update:
      x-speakeasy-mcp:
        scopes: [read]
        disabled: false

  # Enable write operations
  - target: $.paths.*["post","put","delete","patch"]
    update:
      x-speakeasy-mcp:
        scopes: [write]
        disabled: false

  # Disable specific sensitive endpoints (customize as needed)
  # - target: $.paths["/admin/danger-zone"]["delete"]
  #   update:
  #     x-speakeasy-mcp:
  #       disabled: true
```

### Step 2: Create the Workflow Configuration

Create `.speakeasy/workflow.yaml`:

```yaml
# .speakeasy/workflow.yaml
workflowVersion: 1.0.0
speakeasyVersion: latest
sources:
  My-API:
    inputs:
      - location: ./openapi.yaml
    overlays:
      - location: mcp-scopes-overlay.yaml
    output: openapi.yaml
targets:
  mcp-server:
    target: mcp-typescript
    source: My-API
```

Replace `./openapi.yaml` with the actual spec path or URL.

> **Important:** Use the standalone `mcp-typescript` target, not `typescript` with `enableMCPServer: true`. The embedded approach (`enableMCPServer` flag) is deprecated.

### Step 3: Configure gen.yaml

Create `.speakeasy/gen.yaml`:

```yaml
# .speakeasy/gen.yaml
configVersion: 2.0.0
generation:
  sdkClassName: MyApiMcp
  maintainOpenAPIOrder: true
  devContainers:
    enabled: true
    schemaPath: ./openapi.yaml
typescript:
  version: 1.0.0
  packageName: my-api-mcp
  envVarPrefix: MYAPI
```

Key settings:
- `target: mcp-typescript` in `workflow.yaml` -- this is what triggers MCP server generation
- `packageName` -- the npm package name users will `npx`
- `envVarPrefix` -- prefix for auto-generated env var names

### Step 4: Generate

```bash
speakeasy run
```

For AI-friendly output:
```bash
speakeasy run --output console 2>&1 | tail -50
```

## Using the Generated MCP Server

### CLI Usage

```bash
# Start with stdio transport (default, for local AI assistants)
npx my-api-mcp mcp start --bearer-auth "YOUR_TOKEN"

# Start with SSE transport (for networked deployment)
npx my-api-mcp mcp start --transport sse --port 3000 --bearer-auth "YOUR_TOKEN"

# Filter by scope (only expose read operations)
npx my-api-mcp mcp start --scope read --bearer-auth "YOUR_TOKEN"

# Mount specific tools only
npx my-api-mcp mcp start --tool users-get-users --tool users-create-user --bearer-auth "YOUR_TOKEN"
```

### CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `--transport` | Transport type: `stdio` or `sse` | `stdio` |
| `--port` | Port for SSE transport | `2718` |
| `--bearer-auth` | API authentication token | Required |
| `--server-url` | Override API base URL | From spec |
| `--scope` | Filter by scope (repeatable) | All scopes |
| `--tool` | Mount specific tools (repeatable) | All tools |
| `--log-level` | Logging level | `info` |

### Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-api": {
      "command": "npx",
      "args": [
        "-y", "--package", "my-api-mcp",
        "--",
        "mcp", "start",
        "--bearer-auth", "<API_TOKEN>"
      ]
    }
  }
}
```

### Claude Code Configuration

Add to `.claude/settings.json` or use `claude mcp add`:

```json
{
  "mcpServers": {
    "my-api": {
      "command": "npx",
      "args": [
        "-y", "--package", "my-api-mcp",
        "--",
        "mcp", "start",
        "--bearer-auth", "<API_TOKEN>"
      ]
    }
  }
}
```

### Docker Deployment

For production, use SSE transport with Docker:

```bash
# Build and run
docker-compose up -d

# Configure MCP client to use SSE endpoint
# "url": "http://localhost:32000/sse"
```

The generated project includes a Dockerfile and docker-compose.yaml.

## Example

Full example generating an MCP server for a pet store API:

```bash
# 1. Validate the spec
speakeasy lint openapi --non-interactive -s ./petstore.yaml

# 2. Create scopes overlay
cat > mcp-scopes-overlay.yaml << 'EOF'
openapi: 3.1.0
overlay: 1.0.0
info:
  title: Add MCP scopes
  version: 0.0.0
actions:
  - target: $.paths.*["get","head"]
    update:
      x-speakeasy-mcp:
        scopes: [read]
        disabled: false
  - target: $.paths.*["post","put","delete","patch"]
    update:
      x-speakeasy-mcp:
        scopes: [write]
        disabled: false
EOF

# 3. Create workflow (assumes .speakeasy/ dir exists)
mkdir -p .speakeasy
cat > .speakeasy/workflow.yaml << 'EOF'
workflowVersion: 1.0.0
speakeasyVersion: latest
sources:
  petstore:
    inputs:
      - location: ./petstore.yaml
    overlays:
      - location: mcp-scopes-overlay.yaml
    output: openapi.yaml
targets:
  mcp-server:
    target: mcp-typescript
    source: petstore
EOF

# 4. Create gen.yaml
cat > .speakeasy/gen.yaml << 'EOF'
configVersion: 2.0.0
generation:
  sdkClassName: PetStoreMcp
  maintainOpenAPIOrder: true
typescript:
  version: 1.0.0
  packageName: petstore-mcp
  envVarPrefix: PETSTORE
EOF

# 5. Generate
speakeasy run

# 6. Test locally
npx petstore-mcp mcp start --bearer-auth "test-token"
```

### Expected Output

```
Workflow completed successfully.
Generated TypeScript MCP server in ./
```

The generated project contains:
- `src/mcp-server/server.ts` -- Main MCP server factory
- `src/mcp-server/tools/` -- One tool per API operation
- `src/mcp-server/mcp-server.ts` -- CLI entry point
- `src/mcp-server/scopes.ts` -- Scope definitions

## Best Practices

1. **Use overlays for MCP config** -- never edit the source OpenAPI spec directly
2. **Enhance descriptions for AI** -- add documentation overlays so AI assistants understand tool purpose
3. **Filter tools at runtime** -- use `--scope` and `--tool` flags to limit what is exposed
4. **Use environment variables** -- never hardcode tokens in config files
5. **Start with read-only scopes** -- add write scopes only when needed
6. **Create a dedicated MCP package** -- keep MCP separate from your main SDK

## What NOT to Do

- **Do NOT** modify the source OpenAPI spec to add `x-speakeasy-mcp` -- use overlays instead
- **Do NOT** hardcode API tokens in Claude Desktop or Claude Code config files -- use environment variables or secrets managers
- **Do NOT** expose all operations without reviewing them -- disable sensitive admin endpoints
- **Do NOT** skip spec validation -- invalid specs produce broken MCP servers
- **Do NOT** use the deprecated `enableMCPServer: true` flag in gen.yaml -- use the standalone `mcp-typescript` target in workflow.yaml instead
- **Do NOT** generate without a scopes overlay -- tools will lack scope definitions
- **Do NOT** use the generated MCP server as a general SDK -- it is purpose-built for AI assistant integration

## Troubleshooting

### MCP server fails to start

**Symptom:** `npx my-api-mcp mcp start` errors immediately.

**Cause:** Missing or invalid authentication flags.

**Fix:**
```bash
# Ensure auth flag matches your API's auth scheme
npx my-api-mcp mcp start --bearer-auth "YOUR_TOKEN"

# Check --help for available auth flags
npx my-api-mcp mcp start --help
```

### No tools appear in AI assistant

**Symptom:** MCP server starts but AI assistant shows no tools.

**Cause:** Missing `x-speakeasy-mcp` extensions or all operations disabled.

**Fix:** Verify the scopes overlay is listed in `workflow.yaml` under `overlays:` and that operations have `disabled: false`.

### Generation fails with mcp-typescript target

**Symptom:** `speakeasy run` fails when using `target: mcp-typescript`.

**Cause:** Usually a spec validation issue, missing workflow config, or using the deprecated `enableMCPServer` flag instead of the `mcp-typescript` target.

**Fix:**
```bash
# Validate spec first
speakeasy lint openapi --non-interactive -s ./openapi.yaml

# Ensure workflow.yaml uses target: mcp-typescript (NOT target: typescript with enableMCPServer)
cat .speakeasy/workflow.yaml

# Remove enableMCPServer from gen.yaml if present -- it is deprecated
```

### Tools missing expected operations

**Symptom:** Some API operations are not available as MCP tools.

**Cause:** Operations not targeted by the scopes overlay or explicitly disabled.

**Fix:** Review `mcp-scopes-overlay.yaml` target selectors. Ensure paths and methods match your spec.
