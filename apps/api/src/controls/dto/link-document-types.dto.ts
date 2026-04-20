import { EvidenceFormType } from '@db';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
} from 'class-validator';

export class LinkDocumentTypesDto {
  @ApiProperty({
    description: 'Evidence form types to require for this control',
    enum: EvidenceFormType,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(EvidenceFormType, { each: true })
  formTypes: EvidenceFormType[];
}
