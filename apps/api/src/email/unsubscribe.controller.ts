import {
  Controller,
  Post,
  Body,
  Query,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { db } from '@db';
import { generateUnsubscribeToken } from '@trycompai/email';
import { timingSafeEqual } from 'node:crypto';

@ApiTags('Email - Unsubscribe')
@Controller({ path: 'email/unsubscribe', version: '1' })
export class UnsubscribeController {
  /**
   * RFC 8058 one-click unsubscribe endpoint.
   * Gmail POSTs to this URL with List-Unsubscribe=One-Click in the body.
   * Email and token come via query params in the URL.
   */
  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'One-click unsubscribe (RFC 8058)' })
  async unsubscribe(
    @Query('email') queryEmail?: string,
    @Query('token') queryToken?: string,
    @Body() body?: { email?: string; token?: string },
  ) {
    // Coerce to string - query params can be arrays if repeated
    const rawEmail = queryEmail || body?.email;
    const rawToken = queryToken || body?.token;
    const email = typeof rawEmail === 'string' ? rawEmail : undefined;
    const token = typeof rawToken === 'string' ? rawToken : undefined;

    if (!email || !token) {
      throw new BadRequestException('Email and token are required');
    }

    // Verify HMAC token (timing-safe comparison)
    const expectedToken = generateUnsubscribeToken(email);
    const tokensMatch =
      expectedToken.length === token.length &&
      timingSafeEqual(Buffer.from(expectedToken), Buffer.from(token));
    if (!tokensMatch) {
      throw new BadRequestException('Invalid token');
    }

    // Unsubscribe the user from all email notifications
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      // Don't reveal user existence - just return success
      return { success: true };
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        emailNotificationsUnsubscribed: true,
        emailPreferences: {
          policyNotifications: false,
          taskReminders: false,
          weeklyTaskDigest: false,
          unassignedItemsNotifications: false,
          taskMentions: false,
          taskAssignments: false,
          findingNotifications: false,
        },
      },
    });

    return { success: true };
  }
}
