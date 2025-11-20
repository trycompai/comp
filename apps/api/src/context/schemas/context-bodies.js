"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTEXT_BODIES = void 0;
const create_context_dto_1 = require("../dto/create-context.dto");
const update_context_dto_1 = require("../dto/update-context.dto");
exports.CONTEXT_BODIES = {
    createContext: {
        description: 'Context entry data',
        type: create_context_dto_1.CreateContextDto,
        examples: {
            'Authentication Context': {
                value: {
                    question: 'How do we handle user authentication in our application?',
                    answer: 'We use a hybrid authentication system supporting both API keys and session-based authentication. API keys are used for programmatic access while sessions are used for web interface interactions.',
                    tags: ['authentication', 'security', 'api', 'sessions'],
                },
            },
            'Database Context': {
                value: {
                    question: 'What database do we use and why?',
                    answer: 'We use PostgreSQL as our primary database with Prisma as the ORM. PostgreSQL provides excellent performance, ACID compliance, and supports advanced features like JSON columns and full-text search.',
                    tags: ['database', 'postgresql', 'prisma', 'architecture'],
                },
            },
        },
    },
    updateContext: {
        description: 'Partial context entry data to update',
        type: update_context_dto_1.UpdateContextDto,
        examples: {
            'Update Tags': {
                value: {
                    tags: ['authentication', 'security', 'api', 'sessions', 'updated'],
                },
            },
            'Update Answer': {
                value: {
                    answer: 'Updated: We use a hybrid authentication system supporting both API keys and session-based authentication. Recent updates include support for OAuth2 providers.',
                },
            },
        },
    },
};
//# sourceMappingURL=context-bodies.js.map