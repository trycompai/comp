import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { db } from '@trycompai/db';
import { UserId } from './auth-context.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Me')
@Controller({ path: 'me', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiSecurity('apikey')
export class MeController {
  @Get('organizations')
  @ApiOperation({
    summary: 'List organizations the current user belongs to',
    description:
      'JWT-authenticated endpoint that does not require X-Organization-Id.',
  })
  @ApiResponse({
    status: 200,
    description: 'Memberships with organization info',
  })
  async listOrganizations(@UserId() userId: string) {
    const memberships = await db.member.findMany({
      where: { userId, deactivated: false },
      include: { organization: true },
    });

    return {
      data: memberships
        .filter((m) => Boolean(m.organization))
        .map((m) => ({
          memberId: m.id,
          role: m.role,
          organization: {
            id: m.organization!.id,
            name: m.organization!.name,
          },
        })),
    };
  }
}
