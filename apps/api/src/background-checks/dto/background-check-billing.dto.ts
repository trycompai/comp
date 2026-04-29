import { IsString } from 'class-validator';

export class BackgroundCheckSetupSessionDto {
  @IsString()
  successUrl: string;

  @IsString()
  cancelUrl: string;
}

export class BackgroundCheckSetupSuccessDto {
  @IsString()
  sessionId: string;
}

export class BackgroundCheckBillingPortalDto {
  @IsString()
  returnUrl: string;
}
