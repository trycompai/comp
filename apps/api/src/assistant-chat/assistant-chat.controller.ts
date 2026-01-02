import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthContext } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import type { AuthContext as AuthContextType } from '../auth/types';
import { SaveAssistantChatHistoryDto } from './assistant-chat.dto';
import { AssistantChatService } from './assistant-chat.service';
import type { AssistantChatMessage } from './assistant-chat.types';

@ApiTags('Assistant Chat')
@Controller({ path: 'assistant-chat', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for JWT auth, optional for API key auth)',
  required: false,
})
export class AssistantChatController {
  constructor(private readonly assistantChatService: AssistantChatService) {}

  private getUserScopedContext(auth: AuthContextType): { organizationId: string; userId: string } {
    // Defensive checks (should already be guaranteed by HybridAuthGuard + AuthContext decorator)
    if (!auth.organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    if (auth.isApiKey) {
      throw new BadRequestException(
        'Assistant chat history is only available for user-authenticated requests (Bearer JWT).',
      );
    }

    if (!auth.userId) {
      throw new BadRequestException('User ID is required');
    }

    return { organizationId: auth.organizationId, userId: auth.userId };
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
  async getHistory(@AuthContext() auth: AuthContextType): Promise<{ messages: AssistantChatMessage[] }> {
    const { organizationId, userId } = this.getUserScopedContext(auth);

    const messages = await this.assistantChatService.getHistory({
      organizationId,
      userId,
    });

    return { messages };
  }

  @Put('history')
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
  @ApiOperation({
    summary: 'Clear assistant chat history',
    description: 'Deletes the current user-scoped assistant chat history.',
  })
  async clearHistory(@AuthContext() auth: AuthContextType): Promise<{ success: true }> {
    const { organizationId, userId } = this.getUserScopedContext(auth);

    await this.assistantChatService.clearHistory({
      organizationId,
      userId,
    });

    return { success: true };
  }
}


