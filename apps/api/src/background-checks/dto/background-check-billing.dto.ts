import { IsString, IsUrl } from 'class-validator';

export class BackgroundCheckSetupSessionDto {
  @IsString()
  @IsUrl({}, { message: 'successUrl must be a valid URL' })
  successUrl: string;

  @IsString()
  @IsUrl({}, { message: 'cancelUrl must be a valid URL' })
  cancelUrl: string;
}

export class BackgroundCheckSetupSuccessDto {
  @IsString()
  sessionId: string;
}

export class BackgroundCheckBillingPortalDto {
  @IsString()
  @IsUrl({}, { message: 'returnUrl must be a valid URL' })
  returnUrl: string;
}
