import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RequestBackgroundCheckDto {
  @IsString()
  @MinLength(1)
  employeeName: string;

  @IsEmail()
  employeeEmail: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  requesterNotes?: string;
}
