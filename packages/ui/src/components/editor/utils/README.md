# TipTap Content Validation Utilities

This module provides utilities to validate and fix common TipTap JSON schema issues, especially useful for AI-generated content that may have structural problems.

## Quick Start

```typescript
import { validateAndFixTipTapContent } from '@comp/ui/editor';

// Fix AI-generated content before using with TipTap
const aiGeneratedContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          text: 'Hello world', // ❌ Missing "type": "text"
        },
      ],
    },
  ],
};

const fixedContent = validateAndFixTipTapContent(aiGeneratedContent);
// ✅ Now safe to use with TipTap editor
```

## API Reference

### `validateAndFixTipTapContent(content: any): JSONContent`

Main utility function that validates and fixes TipTap JSON schema issues.

**Fixes:**

- Missing `"type": "text"` properties on text nodes
- Wraps content arrays in proper `doc` structure
- Ensures all nodes have required properties
- Validates and fixes list structures
- Handles malformed paragraphs, headings, and other nodes
- Provides fallbacks for completely invalid content

**Parameters:**

- `content` - Any JSON content that should be TipTap-compatible

**Returns:**

- Valid `JSONContent` that can be safely used with TipTap

### `isValidTipTapContent(content: any): boolean`

Checks if content is already valid TipTap format.

```typescript
import { isValidTipTapContent } from '@comp/ui/editor';

if (!isValidTipTapContent(myContent)) {
  myContent = validateAndFixTipTapContent(myContent);
}
```

### `debugTipTapContent(content: any): void`

Debug utility that logs detailed information about content structure issues.

```typescript
import { debugTipTapContent } from '@comp/ui/editor';

// Log detailed structure analysis
debugTipTapContent(suspiciousContent);
```

## Common Issues Fixed

### 1. Missing Text Node Types

```typescript
// ❌ AI-generated content often misses this
{
  type: "paragraph",
  content: [
    {
      text: "Hello world" // Missing "type": "text"
    }
  ]
}

// ✅ Fixed automatically
{
  type: "paragraph",
  content: [
    {
      type: "text",
      text: "Hello world"
    }
  ]
}
```

### 2. Array Content Instead of Doc Structure

```typescript
// ❌ Common AI mistake
[
  { type: "paragraph", content: [...] }
]

// ✅ Wrapped in doc automatically
{
  type: "doc",
  content: [
    { type: "paragraph", content: [...] }
  ]
}
```

### 3. Malformed Lists

```typescript
// ❌ Missing listItem content
{
  type: "bulletList",
  content: [
    {
      type: "listItem"
      // Missing content array
    }
  ]
}

// ✅ Fixed with empty paragraph
{
  type: "bulletList",
  content: [
    {
      type: "listItem",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "" }] }
      ]
    }
  ]
}
```

## Integration Examples

### With AI Policy Generation

```typescript
import { validateAndFixTipTapContent } from '@comp/ui/editor';

async function generatePolicy(prompt: string) {
  const aiResponse = await callAI(prompt);

  // Always validate AI-generated content
  const validContent = validateAndFixTipTapContent(aiResponse.content);

  return validContent;
}
```

### In React Components

```typescript
import { Editor, validateAndFixTipTapContent } from '@comp/ui/editor';

function PolicyEditor({ aiGeneratedContent }) {
  // Content is automatically fixed by the Editor component now,
  // but you can also do it manually for additional processing
  const processedContent = validateAndFixTipTapContent(aiGeneratedContent);

  return (
    <Editor
      initialContent={processedContent}
      onSave={handleSave}
    />
  );
}
```

### Batch Processing

```typescript
import { validateAndFixTipTapContent } from '@comp/ui/editor';

function processPolicyBatch(policies: any[]) {
  return policies.map((policy) => ({
    ...policy,
    content: validateAndFixTipTapContent(policy.content),
  }));
}
```

## Error Handling

The utility is designed to never throw errors. Instead, it provides sensible fallbacks:

- Invalid content → Empty document with single paragraph
- Missing required properties → Added with default values
- Malformed structures → Rebuilt with valid alternatives

```typescript
// These all return valid content instead of throwing
validateAndFixTipTapContent(null); // Empty doc
validateAndFixTipTapContent('string'); // Empty doc
validateAndFixTipTapContent({}); // Empty doc
validateAndFixTipTapContent(malformedJSON); // Fixed version
```

## Performance

- Lightweight validation with minimal overhead
- Only processes content that needs fixing
- Preserves original structure when possible
- No external dependencies beyond TipTap types

## TypeScript Support

Full TypeScript support with proper type inference:

```typescript
import type { JSONContent } from '@tiptap/react';
import { validateAndFixTipTapContent } from '@comp/ui/editor';

const content: any = getAIContent();
const validContent: JSONContent = validateAndFixTipTapContent(content);
```
