import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RequestBackgroundCheckDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'employeeName must not be empty' })
  employeeName: string;

  @IsEmail()
  employeeEmail: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  requesterNotes?: string;
}
