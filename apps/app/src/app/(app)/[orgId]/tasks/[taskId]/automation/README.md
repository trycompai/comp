# Task Automation System

A comprehensive system for creating, managing, and executing automated task scripts using AI assistance.

## Overview

The Task Automation System allows users to:

- Chat with AI to generate automation scripts
- Store scripts directly in S3 (no sandboxes needed)
- Execute scripts via Trigger.dev
- Visualize automation workflows
- Test scripts with real-time feedback

## Architecture

### Directory Structure

```
automation/
├── components/              # UI Components
│   ├── automation/         # Automation-specific components
│   │   └── AutomationTester.tsx
│   ├── workflow/           # Workflow visualization
│   │   └── workflow-visualizer-simple.tsx
│   └── [other components]
├── hooks/                  # Custom React Hooks
│   ├── use-task-automation-script.ts
│   ├── use-task-automation-scripts-list.ts
│   ├── use-task-automation-execution.ts
│   └── use-task-automation-workflow.ts
├── lib/                    # Core Libraries
│   ├── types/              # TypeScript definitions
│   ├── task-automation-api.ts    # API client
│   ├── task-automation-store.ts  # Zustand state management
│   └── chat-context.tsx          # Chat context provider
├── chat.tsx                # Main chat interface
├── page.tsx                # Main page component
└── README.md               # This file
```

### Key Components

#### 1. **Chat Interface** (`chat.tsx`)

- AI-powered chat for generating automation scripts
- Uses actual `orgId` and `taskId` (not test constants)
- Sends context to AI including available secrets

#### 2. **Automation Tester** (`components/automation/AutomationTester.tsx`)

- Lists all scripts for an organization
- Allows testing scripts with one click
- Shows execution results and logs

#### 3. **Workflow Visualizer** (`components/workflow/workflow-visualizer-simple.tsx`)

- Visualizes automation steps
- Parses scripts to extract workflow
- Shows test results in a dialog

#### 4. **Script Initializer** (`script-initializer.tsx`)

- Checks for existing scripts on load
- Updates UI state automatically

### API Routes

#### `/api/tasks-automations/chat`

- Handles AI chat interactions
- Uses limited tool set (only `storeToS3`)
- Receives actual `orgId` and `taskId` from frontend

#### `/api/tasks-automations/s3/*`

- `/get` - Fetch script content
- `/list` - List organization scripts
- `/upload` - Upload new scripts

#### `/api/tasks-automations/trigger/execute`

- Executes scripts via Trigger.dev
- Returns results and logs

### State Management

Uses Zustand for global state:

- `chatStatus` - Current chat state
- `scriptGenerated` - Whether a script exists
- `scriptPath` - S3 path of the script

### Custom Hooks

All hooks follow the `useTaskAutomation*` naming convention:

1. **`useTaskAutomationScript`**
   - Fetches individual scripts
   - Handles script uploads
   - SWR caching

2. **`useTaskAutomationScriptsList`**
   - Lists all scripts for an org
   - Auto-refresh capability

3. **`useTaskAutomationExecution`**
   - Executes scripts
   - Manages execution state
   - Error handling

4. **`useTaskAutomationWorkflow`**
   - Analyzes scripts for workflow steps
   - Client-side parsing (can be enhanced with AI)

## Data Flow

1. User chats with AI in the chat interface
2. AI generates script and saves directly to S3 using `storeToS3` tool
3. UI detects S3 upload via data mapper and updates state
4. Workflow visualizer fetches and analyzes the script
5. User can test the script, which executes via Trigger.dev
6. Results are displayed in the UI

## Key Features

### No Sandboxes

- Scripts are saved directly to S3
- No Vercel Sandbox creation or file generation
- Simpler, more direct workflow

### Real Organization Data

- Uses actual `orgId` and `taskId` from route
- No hardcoded test constants
- Scripts are properly scoped to organizations

### Professional Code Organization

- Consistent naming conventions
- Comprehensive TypeScript types
- JSDoc comments on all public APIs
- Clean separation of concerns

## Usage

```tsx
// The main automation page receives orgId and taskId from route params
<Chat orgId={orgId} taskId={taskId} />
<WorkflowVisualizer />
<AutomationTester orgId={orgId} />
```

## Environment Variables

Required:

- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` - For AI chat
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - For S3 access
- `TRIGGER_API_KEY` - For Trigger.dev execution

## Future Enhancements

1. **AI-Powered Workflow Analysis**
   - Replace client-side parsing with AI analysis
   - More accurate workflow extraction

2. **Script Templates**
   - Pre-built automation templates
   - Quick start options

3. **Execution History**
   - Track all script executions
   - Performance metrics

4. **Collaborative Features**
   - Share scripts between team members
   - Version control integration
