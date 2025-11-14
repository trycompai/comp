import type { ApiResponseOptions } from '@nestjs/swagger';

export const DOWNLOAD_MAC_AGENT_RESPONSES: Record<number, ApiResponseOptions> =
  {
    200: {
      description: 'macOS agent DMG file download',
      content: {
        'application/x-apple-diskimage': {
          schema: {
            type: 'string',
            format: 'binary',
          },
          example: 'Binary DMG file content',
        },
      },
      headers: {
        'Content-Disposition': {
          description:
            'Indicates file should be downloaded with specific filename',
          schema: {
            type: 'string',
            example: 'attachment; filename="Comp AI Agent-1.0.0-arm64.dmg"',
          },
        },
        'Content-Type': {
          description: 'MIME type for macOS disk image',
          schema: {
            type: 'string',
            example: 'application/x-apple-diskimage',
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
      description: 'macOS agent file not found in S3',
      content: {
        'application/json': {
          example: {
            message: 'macOS agent DMG file not found in S3',
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
