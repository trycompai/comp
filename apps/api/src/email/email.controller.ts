import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { tasks } from '@trigger.dev/sdk';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { SendEmailDto } from './dto/send-email.dto';
import type { sendEmailTask } from '../trigger/email/send-email';

@ApiTags('Internal - Email')
@Controller({ path: 'internal/email', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class EmailController {
  @Post('send')
  @HttpCode(200)
  @RequirePermission('email', 'send')
  @ApiOperation({
    summary: 'Send an email via the centralized Trigger task (internal)',
  })
  @ApiResponse({ status: 200, description: 'Email task triggered' })
  async sendEmail(@Body() dto: SendEmailDto) {
    const fromAddress = dto.system
      ? (process.env.RESEND_FROM_SYSTEM ?? process.env.RESEND_FROM_DEFAULT)
      : (dto.from ?? process.env.RESEND_FROM_DEFAULT);

    const handle = await tasks.trigger<typeof sendEmailTask>('send-email', {
      to: dto.to,
      subject: dto.subject,
      html: dto.html,
      from: fromAddress,
      cc: dto.cc,
      scheduledAt: dto.scheduledAt,
      attachments: dto.attachments,
    });

    return { success: true, taskId: handle.id };
  }
}
