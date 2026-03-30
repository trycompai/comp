import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai';
import type { Response, Request } from 'express';
import { AuthContext } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { SessionOnlyGuard } from '../auth/session-only.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { SkipAuditLog } from '../audit/skip-audit-log.decorator';
import { SaveAssistantChatHistoryDto } from './assistant-chat.dto';
import { AssistantChatService } from './assistant-chat.service';
import { buildTools } from './assistant-chat-tools';
import type { AssistantChatMessage } from './assistant-chat.types';
import { RolesService } from '../roles/roles.service';

@ApiTags('Assistant Chat')
@Controller({ path: 'assistant-chat', version: '1' })
@UseGuards(HybridAuthGuard, SessionOnlyGuard, PermissionGuard)
@RequirePermission('app', 'read')
@ApiSecurity('apikey')
export class AssistantChatController {
  private readonly logger = new Logger(AssistantChatController.name);

  constructor(
    private readonly assistantChatService: AssistantChatService,
    private readonly rolesService: RolesService,
  ) {}

  private getUserScopedContext(auth: AuthContextType): {
    organizationId: string;
    userId: string;
  } {
    if (!auth.organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    if (!auth.userId) {
      throw new BadRequestException('User ID is required');
    }

    return { organizationId: auth.organizationId, userId: auth.userId };
  }

  @Post('completions')
  @SkipAuditLog()
  @ApiOperation({
    summary: 'Stream AI chat completion',
    description:
      'Streams an AI response based on the conversation messages. Tools are permission-gated per user.',
  })
  @ApiResponse({ status: 200, description: 'Streaming AI response' })
  async completions(
    @AuthContext() auth: AuthContextType,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // @Res() bypasses NestJS exception filters, so we must handle errors manually
    try {
      if (!process.env.OPENAI_API_KEY) {
        res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ message: 'AI service not configured' });
        return;
      }

      const { organizationId, userId } = this.getUserScopedContext(auth);

      const body = req.body as { messages?: UIMessage[] };
      const messages = body?.messages ?? [];

      const userRoles = auth.userRoles ?? [];
      const permissions = await this.rolesService.resolvePermissions(
        organizationId,
        userRoles,
      );

      const tools = buildTools({ organizationId, userId, permissions });

      const nowIso = new Date().toISOString();

      const systemPrompt = `
You're an expert in GRC, and a helpful assistant in Comp AI,
a platform that helps companies get compliant with frameworks
like SOC 2, ISO 27001 and GDPR.

You must respond in basic markdown format (only use paragraphs, lists and bullet points).

Keep responses concise and to the point.

If you are unsure about the answer, say "I don't know" or "I don't know the answer to that question".

Important:
- Today's date/time is ${nowIso}.
- You are assisting a user inside a live application (organizationId: ${organizationId}).
- Prefer using available tools to fetch up-to-date org data (policies, risks, organization details) rather than guessing.
- If the question depends on the customer's current configuration/data and you haven't retrieved it, call the relevant tool first.
- If the user asks about data you don't have tools for, let them know you can't access that information with their current permissions.
`;

      const result = streamText({
        model: openai('gpt-5'),
        system: systemPrompt,
        messages: convertToModelMessages(messages),
        tools,
        stopWhen: stepCountIs(5),
      });

      const webResponse = result.toUIMessageStreamResponse({
        sendReasoning: false,
      });

      res.status(webResponse.status);
      webResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      if (webResponse.body) {
        const reader = webResponse.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            res.write(value);
          }
        } catch (error) {
          this.logger.error('Stream reading error', error);
        } finally {
          res.end();
        }
      } else {
        res.end();
      }
    } catch (error) {
      this.logger.error('Completions endpoint error', error);
      if (!res.headersSent) {
        const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        const message = error instanceof HttpException ? error.message : 'Internal server error';
        res.status(status).json({ message });
      } else {
        res.end();
      }
    }
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get assistant chat history',
    description:
      'Returns the current user-scoped assistant chat history (ephemeral session context).',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat history retrieved',
    schema: {
      type: 'object',
      properties: {
        messages: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  async getHistory(
    @AuthContext() auth: AuthContextType,
  ): Promise<{ messages: AssistantChatMessage[] }> {
    const { organizationId, userId } = this.getUserScopedContext(auth);

    const messages = await this.assistantChatService.getHistory({
      organizationId,
      userId,
    });

    return { messages };
  }

  @Put('history')
  @SkipAuditLog()
  @ApiOperation({
    summary: 'Save assistant chat history',
    description:
      'Replaces the current user-scoped assistant chat history (ephemeral session context).',
  })
  async saveHistory(
    @AuthContext() auth: AuthContextType,
    @Body() dto: SaveAssistantChatHistoryDto,
  ): Promise<{ success: true }> {
    const { organizationId, userId } = this.getUserScopedContext(auth);

    await this.assistantChatService.saveHistory(
      { organizationId, userId },
      dto.messages,
    );

    return { success: true };
  }

  @Delete('history')
  @SkipAuditLog()
  @ApiOperation({
    summary: 'Clear assistant chat history',
    description: 'Deletes the current user-scoped assistant chat history.',
  })
  async clearHistory(
    @AuthContext() auth: AuthContextType,
  ): Promise<{ success: true }> {
    const { organizationId, userId } = this.getUserScopedContext(auth);

    await this.assistantChatService.clearHistory({
      organizationId,
      userId,
    });

    return { success: true };
  }
}
