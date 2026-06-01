import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class LinkIsmsControlsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  controlIds!: string[];
}
