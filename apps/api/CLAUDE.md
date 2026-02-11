# API Development Guidelines

This document provides guidelines for AI assistants (Claude, Cursor, etc.) when working on the API codebase.

## Project Structure

```
apps/api/src/
├── auth/           # Authentication (better-auth, guards, decorators)
├── roles/          # Custom roles CRUD API
├── <module>/       # Feature modules (controller, service, DTOs)
└── utils/          # Shared utilities
```

## Testing Requirements

### Mandatory Testing

**Every new feature MUST include tests.** Before marking a task as complete:

1. Write unit tests for new services and controllers
2. Run the tests to verify they pass
3. Commit tests alongside the feature code

### Running Tests

```bash
# Run tests for a specific module (from apps/api directory)
npx jest src/<module-name> --passWithNoTests

# Run tests for changed files only
npx jest --onlyChanged

# Run all API tests (from repo root)
npx turbo run test --filter=@comp/api

# Type-check before committing
npx turbo run typecheck --filter=@comp/api
```

### Test Patterns

Follow existing test patterns in the codebase:

```typescript
// Mock external dependencies
jest.mock('@trycompai/db', () => ({
  db: {
    someTable: {
      findFirst: jest.fn(),
      create: jest.fn(),
      // ...
    },
  },
}));

// Mock ESM modules if needed (e.g., jose)
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

// Override guards in controller tests
const module = await Test.createTestingModule({
  controllers: [MyController],
  providers: [{ provide: MyService, useValue: mockService }],
})
  .overrideGuard(HybridAuthGuard)
  .useValue({ canActivate: () => true })
  .compile();
```

### What to Test

| Component | Test Coverage |
|-----------|---------------|
| Services | All public methods, validation logic, error handling |
| Controllers | Parameter passing to services, response mapping |
| Guards | Authorization decisions, edge cases |
| DTOs | Validation decorators (via e2e or integration tests) |
| Utils | All functions, edge cases, error conditions |

## Code Style

### Authentication & Authorization

- Use `@UseGuards(HybridAuthGuard, PermissionGuard)` for protected endpoints
- Use `@RequirePermission('resource', 'action')` decorator for RBAC
- Access auth context via `@AuthContext()` decorator
- Access organization ID via `@OrganizationId()` decorator

### Error Handling

- Use NestJS exceptions: `BadRequestException`, `NotFoundException`, `ForbiddenException`
- Provide clear, actionable error messages
- Don't expose internal details in error responses

### Database Access

- Use Prisma via `@trycompai/db`
- Always scope queries by `organizationId` for multi-tenancy
- Use transactions for operations that modify multiple records

## Development Workflow

1. **Before coding**: Read existing code patterns in the module
2. **During coding**: Follow established patterns, add types
3. **After coding**:
   - Run `npx turbo run typecheck --filter=@comp/api`
   - Write and run tests: `npx jest src/<module>`
   - Commit with conventional commit message

## Common Commands

```bash
# Start API in development
npx turbo run dev --filter=@comp/api

# Type-check
npx turbo run typecheck --filter=@comp/api

# Run specific test file
npx jest src/roles/roles.service.spec.ts

# Generate Prisma client after schema changes
cd packages/db && npx prisma generate
```

## RBAC System

The API uses a hybrid RBAC system:

- **Built-in roles**: owner, admin, auditor, employee, contractor
- **Custom roles**: Stored in `organization_role` table
- **Permissions**: `resource:action` format (e.g., `control:read`)
- **Multiple roles**: Users can have multiple roles (comma-separated in `member.role`)

When checking permissions:
- Use `@RequirePermission('resource', 'action')` for endpoint protection
- For privilege escalation checks, combine permissions from all user roles
