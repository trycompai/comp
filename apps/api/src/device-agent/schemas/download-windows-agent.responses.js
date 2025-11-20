"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOWNLOAD_WINDOWS_AGENT_RESPONSES = void 0;
exports.DOWNLOAD_WINDOWS_AGENT_RESPONSES = {
    200: {
        description: 'Windows agent ZIP file download containing MSI installer and setup scripts',
        content: {
            'application/zip': {
                schema: {
                    type: 'string',
                    format: 'binary',
                },
                example: 'Binary ZIP file content',
            },
        },
        headers: {
            'Content-Disposition': {
                description: 'Indicates file should be downloaded with specific filename',
                schema: {
                    type: 'string',
                    example: 'attachment; filename="compai-device-agent-windows.zip"',
                },
            },
            'Content-Type': {
                description: 'MIME type for ZIP archive',
                schema: {
                    type: 'string',
                    example: 'application/zip',
                },
            },
        },
    },
    401: {
        description: 'Unauthorized - Invalid or missing authentication',
        content: {
            'application/json': {
                example: {
                    message: 'Unauthorized',
                    statusCode: 401,
                },
            },
        },
    },
    404: {
        description: 'Windows agent file not found in S3',
        content: {
            'application/json': {
                example: {
                    message: 'Failed to create Windows agent zip',
                    statusCode: 404,
                },
            },
        },
    },
    500: {
        description: 'Internal server error',
        content: {
            'application/json': {
                example: {
                    message: 'Internal server error',
                    statusCode: 500,
                },
            },
        },
    },
};
//# sourceMappingURL=download-windows-agent.responses.js.map