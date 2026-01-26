import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { FindingTemplateService } from './finding-template.service';
import { CreateFindingTemplateDto } from './dto/create-finding-template.dto';
import { UpdateFindingTemplateDto } from './dto/update-finding-template.dto';
import { ValidateFindingTemplateIdPipe } from './pipes/validate-id.pipe';

@ApiTags('Finding Templates')
@Controller({ path: 'finding-template', version: '1' })
export class FindingTemplateController {
  constructor(
    private readonly findingTemplateService: FindingTemplateService,
  ) {}

  @Get()
  @UseGuards(HybridAuthGuard)
  @ApiOperation({
    summary: 'Get all finding templates',
    description: 'Retrieve all finding templates ordered by category and order',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all finding templates',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getAllFindingTemplates() {
    return await this.findingTemplateService.findAll();
  }

  @Get(':id')
  @UseGuards(HybridAuthGuard)
  @ApiOperation({
    summary: 'Get finding template by ID',
    description: 'Retrieve a specific finding template by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Finding template ID',
    example: 'fnd_t_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'The finding template',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Finding template not found',
  })
  async getFindingTemplateById(
    @Param('id', ValidateFindingTemplateIdPipe) id: string,
  ) {
    return await this.findingTemplateService.findById(id);
  }

  @Post()
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({
    summary: 'Create a finding template',
    description: 'Create a new finding template (Platform Admin only)',
  })
  @ApiBody({
    type: CreateFindingTemplateDto,
    description: 'Finding template data',
  })
  @ApiResponse({
    status: 201,
    description: 'The created finding template',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Platform admin required',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async createFindingTemplate(@Body() createDto: CreateFindingTemplateDto) {
    return await this.findingTemplateService.create(createDto);
  }

  @Patch(':id')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({
    summary: 'Update a finding template',
    description: 'Update an existing finding template (Platform Admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Finding template ID',
    example: 'fnd_t_abc123',
  })
  @ApiBody({
    type: UpdateFindingTemplateDto,
    description: 'Finding template update data',
  })
  @ApiResponse({
    status: 200,
    description: 'The updated finding template',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Platform admin required',
  })
  @ApiResponse({
    status: 404,
    description: 'Finding template not found',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async updateFindingTemplate(
    @Param('id', ValidateFindingTemplateIdPipe) id: string,
    @Body() updateDto: UpdateFindingTemplateDto,
  ) {
    return await this.findingTemplateService.updateById(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({
    summary: 'Delete a finding template',
    description: 'Delete a finding template (Platform Admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Finding template ID',
    example: 'fnd_t_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Finding template deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Platform admin required',
  })
  @ApiResponse({
    status: 404,
    description: 'Finding template not found',
  })
  async deleteFindingTemplate(
    @Param('id', ValidateFindingTemplateIdPipe) id: string,
  ) {
    return await this.findingTemplateService.deleteById(id);
  }
}
