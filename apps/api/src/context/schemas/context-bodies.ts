import type { ApiBodyOptions } from '@nestjs/swagger';
import { CreateContextDto } from '../dto/create-context.dto';
import { UpdateContextDto } from '../dto/update-context.dto';

export const CONTEXT_BODIES: Record<string, ApiBodyOptions> = {
  createContext: {
    description: 'Context entry data',
    type: CreateContextDto,
    examples: {
      'Authentication Context': {
        value: {
          question: 'How do we handle user authentication in our application?',
          answer:
            'We use a hybrid authentication system supporting both API keys and session-based authentication. API keys are used for programmatic access while sessions are used for web interface interactions.',
          tags: ['authentication', 'security', 'api', 'sessions'],
        },
      },
      'Database Context': {
        value: {
          question: 'What database do we use and why?',
          answer:
            'We use PostgreSQL as our primary database with Prisma as the ORM. PostgreSQL provides excellent performance, ACID compliance, and supports advanced features like JSON columns and full-text search.',
          tags: ['database', 'postgresql', 'prisma', 'architecture'],
        },
      },
    },
  },
  updateContext: {
    description: 'Partial context entry data to update',
    type: UpdateContextDto,
    examples: {
      'Update Tags': {
        value: {
          tags: ['authentication', 'security', 'api', 'sessions', 'updated'],
        },
      },
      'Update Answer': {
        value: {
          answer:
            'Updated: We use a hybrid authentication system supporting both API keys and session-based authentication. Recent updates include support for OAuth2 providers.',
        },
      },
    },
  },
};
