import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import {
  CreateVersionDto,
  PublishVersionDto,
  SubmitForApprovalDto,
  UpdateVersionContentDto,
} from './dto/version.dto';
import { PoliciesService } from './policies.service';
import { GET_ALL_POLICIES_RESPONSES } from './schemas/get-all-policies.responses';
import { GET_POLICY_BY_ID_RESPONSES } from './schemas/get-policy-by-id.responses';
import { CREATE_POLICY_RESPONSES } from './schemas/create-policy.responses';
import { UPDATE_POLICY_RESPONSES } from './schemas/update-policy.responses';
import { DELETE_POLICY_RESPONSES } from './schemas/delete-policy.responses';
import { POLICY_OPERATIONS } from './schemas/policy-operations';
import { POLICY_PARAMS } from './schemas/policy-params';
import { POLICY_BODIES } from './schemas/policy-bodies';
import { VERSION_OPERATIONS } from './schemas/version-operations';
import { VERSION_PARAMS } from './schemas/version-params';
import { VERSION_BODIES } from './schemas/version-bodies';
import {
  CREATE_POLICY_VERSION_RESPONSES,
  DELETE_VERSION_RESPONSES,
  GET_POLICY_VERSION_BY_ID_RESPONSES,
  GET_POLICY_VERSIONS_RESPONSES,
  PUBLISH_VERSION_RESPONSES,
  SET_ACTIVE_VERSION_RESPONSES,
  SUBMIT_VERSION_FOR_APPROVAL_RESPONSES,
  UPDATE_VERSION_CONTENT_RESPONSES,
} from './schemas/version-responses';
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

  @Get('download-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Download all published policies as a single PDF',
    description:
      'Generates a PDF bundle containing all published policies with organization branding and returns a signed download URL',
  })
  @ApiResponse({
    status: 200,
    description: 'Signed URL for PDF bundle returned',
  })
  @ApiResponse({
    status: 404,
    description: 'No published policies found',
  })
  async downloadAllPolicies(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const result =
      await this.policiesService.downloadAllPoliciesPdf(organizationId);

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

  @Get(':id/versions')
  @ApiOperation(VERSION_OPERATIONS.getPolicyVersions)
  @ApiParam(VERSION_PARAMS.policyId)
  @ApiResponse(GET_POLICY_VERSIONS_RESPONSES[200])
  @ApiResponse(GET_POLICY_VERSIONS_RESPONSES[401])
  @ApiResponse(GET_POLICY_VERSIONS_RESPONSES[404])
  async getPolicyVersions(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.getVersions(id, organizationId);

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Get(':id/versions/:versionId')
  @ApiOperation(VERSION_OPERATIONS.getPolicyVersionById)
  @ApiParam(VERSION_PARAMS.policyId)
  @ApiParam(VERSION_PARAMS.versionId)
  @ApiResponse(GET_POLICY_VERSION_BY_ID_RESPONSES[200])
  @ApiResponse(GET_POLICY_VERSION_BY_ID_RESPONSES[401])
  @ApiResponse(GET_POLICY_VERSION_BY_ID_RESPONSES[404])
  async getPolicyVersionById(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.getVersionById(
      id,
      versionId,
      organizationId,
    );

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post(':id/versions')
  @ApiOperation(VERSION_OPERATIONS.createPolicyVersion)
  @ApiParam(VERSION_PARAMS.policyId)
  @ApiBody(VERSION_BODIES.createVersion)
  @ApiResponse(CREATE_POLICY_VERSION_RESPONSES[201])
  @ApiResponse(CREATE_POLICY_VERSION_RESPONSES[400])
  @ApiResponse(CREATE_POLICY_VERSION_RESPONSES[401])
  @ApiResponse(CREATE_POLICY_VERSION_RESPONSES[404])
  async createPolicyVersion(
    @Param('id') id: string,
    @Body() body: CreateVersionDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.createVersion(
      id,
      organizationId,
      body,
      authContext.userId,
    );

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Patch(':id/versions/:versionId')
  @ApiOperation(VERSION_OPERATIONS.updateVersionContent)
  @ApiParam(VERSION_PARAMS.policyId)
  @ApiParam(VERSION_PARAMS.versionId)
  @ApiBody(VERSION_BODIES.updateVersionContent)
  @ApiResponse(UPDATE_VERSION_CONTENT_RESPONSES[200])
  @ApiResponse(UPDATE_VERSION_CONTENT_RESPONSES[400])
  @ApiResponse(UPDATE_VERSION_CONTENT_RESPONSES[401])
  @ApiResponse(UPDATE_VERSION_CONTENT_RESPONSES[404])
  async updateVersionContent(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: UpdateVersionContentDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.updateVersionContent(
      id,
      versionId,
      organizationId,
      body,
    );

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Delete(':id/versions/:versionId')
  @ApiOperation(VERSION_OPERATIONS.deletePolicyVersion)
  @ApiParam(VERSION_PARAMS.policyId)
  @ApiParam(VERSION_PARAMS.versionId)
  @ApiResponse(DELETE_VERSION_RESPONSES[200])
  @ApiResponse(DELETE_VERSION_RESPONSES[400])
  @ApiResponse(DELETE_VERSION_RESPONSES[401])
  @ApiResponse(DELETE_VERSION_RESPONSES[404])
  async deletePolicyVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.deleteVersion(
      id,
      versionId,
      organizationId,
    );

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post(':id/versions/publish')
  @ApiOperation(VERSION_OPERATIONS.publishPolicyVersion)
  @ApiParam(VERSION_PARAMS.policyId)
  @ApiBody(VERSION_BODIES.publishVersion)
  @ApiResponse(PUBLISH_VERSION_RESPONSES[200])
  @ApiResponse(PUBLISH_VERSION_RESPONSES[400])
  @ApiResponse(PUBLISH_VERSION_RESPONSES[401])
  @ApiResponse(PUBLISH_VERSION_RESPONSES[404])
  async publishPolicyVersion(
    @Param('id') id: string,
    @Body() body: PublishVersionDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.publishVersion(
      id,
      organizationId,
      body,
      authContext.userId,
    );

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post(':id/versions/:versionId/activate')
  @ApiOperation(VERSION_OPERATIONS.setActivePolicyVersion)
  @ApiParam(VERSION_PARAMS.policyId)
  @ApiParam(VERSION_PARAMS.versionId)
  @ApiResponse(SET_ACTIVE_VERSION_RESPONSES[200])
  @ApiResponse(SET_ACTIVE_VERSION_RESPONSES[400])
  @ApiResponse(SET_ACTIVE_VERSION_RESPONSES[401])
  @ApiResponse(SET_ACTIVE_VERSION_RESPONSES[404])
  async setActivePolicyVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.setActiveVersion(
      id,
      versionId,
      organizationId,
    );

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post(':id/versions/:versionId/submit-for-approval')
  @ApiOperation(VERSION_OPERATIONS.submitVersionForApproval)
  @ApiParam(VERSION_PARAMS.policyId)
  @ApiParam(VERSION_PARAMS.versionId)
  @ApiBody(VERSION_BODIES.submitForApproval)
  @ApiResponse(SUBMIT_VERSION_FOR_APPROVAL_RESPONSES[200])
  @ApiResponse(SUBMIT_VERSION_FOR_APPROVAL_RESPONSES[400])
  @ApiResponse(SUBMIT_VERSION_FOR_APPROVAL_RESPONSES[401])
  @ApiResponse(SUBMIT_VERSION_FOR_APPROVAL_RESPONSES[404])
  async submitVersionForApproval(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: SubmitForApprovalDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.submitForApproval(
      id,
      versionId,
      organizationId,
      body,
    );

    return {
      data,
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

    // Use currentVersion content if available, fallback to policy.content for backward compatibility
    const effectiveContent = policy.currentVersion?.content ?? policy.content;
    const policyContentText = this.convertPolicyContentToText(effectiveContent);

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
