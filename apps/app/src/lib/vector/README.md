# Vector Search Utilities

This directory contains utilities for semantic search using Upstash Vector and OpenAI embeddings.

## Structure

```
lib/vector/
├── core/                    # Core functionality
│   ├── client.ts           # Upstash Vector client initialization
│   ├── generate-embedding.ts # OpenAI embedding generation
│   ├── find-similar.ts     # Semantic search function
│   └── upsert-embedding.ts # Embedding storage
├── utils/                   # Utility functions
│   ├── chunk-text.ts       # Text chunking utility
│   └── extract-policy-text.ts # TipTap JSON to text conversion
├── index.ts                 # Main exports
└── README.md               # This file
```

## Setup

1. **Create Upstash Vector Database**
   - Go to [Upstash Console](https://console.upstash.com)
   - Create a new Vector Database
   - Copy the REST URL and Token

2. **Add Environment Variables**
   Add to your `.env` file:
   ```
   UPSTASH_VECTOR_REST_URL=your_vector_rest_url
   UPSTASH_VECTOR_REST_TOKEN=your_vector_rest_token
   OPENAI_API_KEY=your_openai_api_key
   ```

3. **Automatic Embedding Creation**
   Embeddings are automatically created when parsing vendor questionnaires.
   The system checks if embeddings exist for your organization and creates them
   automatically if needed (first 10 policies and 10 context entries).

## Usage

### Find Similar Content

```typescript
import { findSimilarContent } from '@/lib/vector';

const results = await findSimilarContent(
  "How do we handle encryption?",
  organizationId,
  5 // limit
);

// Results contain:
// - id: embedding ID
// - score: similarity score (0-1)
// - content: text content
// - sourceType: 'policy' | 'context' | 'document_hub' | 'attachment'
// - sourceId: ID of the source document
// - policyName: (if sourceType is 'policy')
// - contextQuestion: (if sourceType is 'context')
```

### Upsert Embedding

```typescript
import { upsertEmbedding } from '@/lib/vector';

await upsertEmbedding(
  'policy_pol123_chunk0',
  'Text content to embed...',
  {
    organizationId: 'org_123',
    sourceType: 'policy',
    sourceId: 'pol_123',
    content: 'Text content...',
    policyName: 'Security Policy',
  }
);
```

### Utilities

```typescript
import { chunkText, extractTextFromPolicy } from '@/lib/vector';

// Chunk text into smaller pieces
const chunks = chunkText(longText, 500, 50); // 500 tokens, 50 overlap

// Extract text from TipTap JSON policy
const text = extractTextFromPolicy(policy);
```

## Files

### Core (`core/`)
- `client.ts` - Upstash Vector client initialization
- `generate-embedding.ts` - OpenAI embedding generation
- `find-similar.ts` - Semantic search function
- `upsert-embedding.ts` - Embedding storage

### Utils (`utils/`)
- `chunk-text.ts` - Text chunking utility
- `extract-policy-text.ts` - TipTap JSON to text conversion

## Next Steps

After setting up vector search, you can:
1. Use `findSimilarContent()` in your auto-answer functionality
2. Create scheduled jobs to keep embeddings up-to-date
3. Add document hub support for additional context sources
