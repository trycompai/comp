import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiExtraModels,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import type { AuthContext as AuthContextType } from '../auth/types';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { AISuggestPolicyRequestDto } from './dto/ai-suggest-policy.dto';
import { PoliciesService } from './policies.service';
import { GET_ALL_POLICIES_RESPONSES } from './schemas/get-all-policies.responses';
import { GET_POLICY_BY_ID_RESPONSES } from './schemas/get-policy-by-id.responses';
import { CREATE_POLICY_RESPONSES } from './schemas/create-policy.responses';
import { UPDATE_POLICY_RESPONSES } from './schemas/update-policy.responses';
import { DELETE_POLICY_RESPONSES } from './schemas/delete-policy.responses';
import { POLICY_OPERATIONS } from './schemas/policy-operations';
import { POLICY_PARAMS } from './schemas/policy-params';
import { POLICY_BODIES } from './schemas/policy-bodies';
import { PolicyResponseDto } from './dto/policy-responses.dto';

@ApiTags('Policies')
@ApiExtraModels(PolicyResponseDto)
@Controller({ path: 'policies', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  @ApiOperation(POLICY_OPERATIONS.getAllPolicies)
  @ApiResponse(GET_ALL_POLICIES_RESPONSES[200])
  @ApiResponse(GET_ALL_POLICIES_RESPONSES[401])
  async getAllPolicies(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const policies = await this.policiesService.findAll(organizationId);

    return {
      data: policies,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Get(':id')
  @ApiOperation(POLICY_OPERATIONS.getPolicyById)
  @ApiParam(POLICY_PARAMS.policyId)
  @ApiResponse(GET_POLICY_BY_ID_RESPONSES[200])
  @ApiResponse(GET_POLICY_BY_ID_RESPONSES[401])
  @ApiResponse(GET_POLICY_BY_ID_RESPONSES[404])
  async getPolicy(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const policy = await this.policiesService.findById(id, organizationId);

    return {
      ...policy,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post()
  @ApiOperation(POLICY_OPERATIONS.createPolicy)
  @ApiBody(POLICY_BODIES.createPolicy)
  @ApiResponse(CREATE_POLICY_RESPONSES[201])
  @ApiResponse(CREATE_POLICY_RESPONSES[400])
  @ApiResponse(CREATE_POLICY_RESPONSES[401])
  async createPolicy(
    @Body() createData: CreatePolicyDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const policy = await this.policiesService.create(
      organizationId,
      createData,
    );

    return {
      ...policy,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Patch(':id')
  @ApiOperation(POLICY_OPERATIONS.updatePolicy)
  @ApiParam(POLICY_PARAMS.policyId)
  @ApiBody(POLICY_BODIES.updatePolicy)
  @ApiResponse(UPDATE_POLICY_RESPONSES[200])
  @ApiResponse(UPDATE_POLICY_RESPONSES[400])
  @ApiResponse(UPDATE_POLICY_RESPONSES[401])
  @ApiResponse(UPDATE_POLICY_RESPONSES[404])
  async updatePolicy(
    @Param('id') id: string,
    @Body() updateData: UpdatePolicyDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const updatedPolicy = await this.policiesService.updateById(
      id,
      organizationId,
      updateData,
    );

    return {
      ...updatedPolicy,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Delete(':id')
  @ApiOperation(POLICY_OPERATIONS.deletePolicy)
  @ApiParam(POLICY_PARAMS.policyId)
  @ApiResponse(DELETE_POLICY_RESPONSES[200])
  @ApiResponse(DELETE_POLICY_RESPONSES[401])
  @ApiResponse(DELETE_POLICY_RESPONSES[404])
  async deletePolicy(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const result = await this.policiesService.deleteById(id, organizationId);

    return {
      ...result,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post(':id/ai-chat')
  @ApiOperation({
    summary: 'Chat with AI about a policy',
    description:
      'Stream AI responses for policy editing assistance. Returns a text/event-stream with AI-generated suggestions.',
  })
  @ApiParam(POLICY_PARAMS.policyId)
  @ApiBody({ type: AISuggestPolicyRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Streaming AI response',
    content: {
      'text/event-stream': {
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async aiChatPolicy(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Body() body: AISuggestPolicyRequestDto,
    @Res() res: Response,
  ) {
    if (!process.env.OPENAI_API_KEY) {
      throw new HttpException(
        'AI service not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const policy = await this.policiesService.findById(id, organizationId);

    const policyContentText = this.convertPolicyContentToText(policy.content);

    const systemPrompt = `You are an expert GRC (Governance, Risk, and Compliance) policy editor. You help users edit and improve their organizational policies to meet compliance requirements like SOC 2, ISO 27001, and GDPR.

Current Policy Name: ${policy.name}
${policy.description ? `Policy Description: ${policy.description}` : ''}

Current Policy Content:
---
${policyContentText}
---

Your role:
1. Help users understand and improve their policies
2. Suggest specific changes when asked
3. Ensure policies remain compliant with relevant frameworks
4. Maintain professional, clear language appropriate for official documentation

When the user asks you to make changes to the policy:
1. First explain what changes you'll make and why
2. Then provide the COMPLETE updated policy content in a code block with the label \`\`\`policy
3. The policy content inside the code block should be in markdown format

IMPORTANT: When providing updated policy content, you MUST include the ENTIRE policy, not just the changed sections. The content in the \`\`\`policy code block will replace the entire current policy.

Keep responses helpful and focused on the policy editing task.`;

    const messages: UIMessage[] = [
      ...(body.chatHistory || []).map((msg) => ({
        id: crypto.randomUUID(),
        role: msg.role,
        content: msg.content,
        parts: [{ type: 'text' as const, text: msg.content }],
      })),
      {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: body.instructions,
        parts: [{ type: 'text' as const, text: body.instructions }],
      },
    ];

    const result = streamText({
      model: openai('gpt-5.1'),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
    });

    return result.pipeTextStreamToResponse(res);
  }

  private convertPolicyContentToText(content: unknown): string {
    if (!content) return '';

    const contentArray = Array.isArray(content) ? content : [content];

    const extractText = (node: unknown): string => {
      if (!node || typeof node !== 'object') return '';

      const n = node as Record<string, unknown>;

      if (n.type === 'text' && typeof n.text === 'string') {
        return n.text;
      }

      if (Array.isArray(n.content)) {
        const texts = n.content.map(extractText).filter(Boolean);

        switch (n.type) {
          case 'heading': {
            const level = (n.attrs as Record<string, unknown>)?.level || 1;
            return (
              '\n' + '#'.repeat(Number(level)) + ' ' + texts.join('') + '\n'
            );
          }
          case 'paragraph':
            return texts.join('') + '\n';
          case 'bulletList':
          case 'orderedList':
            return '\n' + texts.join('');
          case 'listItem':
            return '- ' + texts.join('') + '\n';
          case 'blockquote':
            return '\n> ' + texts.join('\n> ') + '\n';
          default:
            return texts.join('');
        }
      }

      return '';
    };

    return contentArray.map(extractText).join('\n').trim();
  }
}
