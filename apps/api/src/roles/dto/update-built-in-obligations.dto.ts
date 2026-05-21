import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BuiltInObligationsBody {
  @ApiProperty({
    description: 'Whether the role must complete compliance tasks.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  compliance?: boolean;
}

export class UpdateBuiltInObligationsDto {
  @ApiProperty({
    description: 'Obligations override for the built-in role.',
    example: { compliance: false },
    required: true,
    type: BuiltInObligationsBody,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => BuiltInObligationsBody)
  obligations!: BuiltInObligationsBody;
}
