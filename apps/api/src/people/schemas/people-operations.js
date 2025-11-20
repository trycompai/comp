"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PEOPLE_OPERATIONS = void 0;
exports.PEOPLE_OPERATIONS = {
    getAllPeople: {
        summary: 'Get all people',
        description: 'Returns all members for the authenticated organization with their user information. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
    },
    createMember: {
        summary: 'Create a new member',
        description: 'Adds a new member to the authenticated organization. The user must already exist in the system. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
    },
    bulkCreateMembers: {
        summary: 'Add multiple members to organization',
        description: 'Bulk adds multiple members to the authenticated organization. Each member must have a valid user ID that exists in the system. Members who already exist in the organization or have invalid data will be skipped with error details returned. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
    },
    getPersonById: {
        summary: 'Get person by ID',
        description: 'Returns a specific member by ID for the authenticated organization with their user information. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
    },
    updateMember: {
        summary: 'Update member',
        description: 'Partially updates a member. Only provided fields will be updated. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
    },
    deleteMember: {
        summary: 'Delete member',
        description: 'Permanently removes a member from the organization. This action cannot be undone. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
    },
};
//# sourceMappingURL=people-operations.js.map