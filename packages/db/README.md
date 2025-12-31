# @trycompai/db

Database package for Comp AI.

## What’s included

- Prisma schema: `dist/schema.prisma`
- Built output: `dist/`
- Postinstall helper binary: `comp-prisma-postinstall`

## Install

```bash
bun add @trycompai/db
```

## Usage

```ts
import { db } from '@trycompai/db';
```

## Notes

- Publishing runs a build automatically via `prepublishOnly`.
- See `INTEGRATION_GUIDE.md` for integration details.


