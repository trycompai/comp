import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { AutomationService } from './automation.service';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { AUTOMATION_OPERATIONS } from './schemas/automation-operations';
import { CREATE_AUTOMATION_RESPONSES } from './schemas/create-automation.responses';
import { UPDATE_AUTOMATION_RESPONSES } from './schemas/update-automation.responses';

@ApiTags('Automations')
@Controller({ path: 'automations', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post()
  @ApiOperation(AUTOMATION_OPERATIONS.createAutomation)
  @ApiResponse(CREATE_AUTOMATION_RESPONSES[201])
  @ApiResponse(CREATE_AUTOMATION_RESPONSES[400])
  @ApiResponse(CREATE_AUTOMATION_RESPONSES[401])
  @ApiResponse(CREATE_AUTOMATION_RESPONSES[404])
  async createAutomation(@Body() createAutomationDto: CreateAutomationDto) {
    return this.automationService.create(createAutomationDto);
  }

  @Patch(':automationId')
  @ApiOperation(AUTOMATION_OPERATIONS.updateAutomation)
  @ApiResponse(UPDATE_AUTOMATION_RESPONSES[200])
  @ApiResponse(UPDATE_AUTOMATION_RESPONSES[400])
  @ApiResponse(UPDATE_AUTOMATION_RESPONSES[401])
  @ApiResponse(UPDATE_AUTOMATION_RESPONSES[404])
  async updateAutomation(
    @Param('automationId') automationId: string,
    @Body() updateAutomationDto: UpdateAutomationDto,
  ) {
    return this.automationService.update(automationId, updateAutomationDto);
  }
}
