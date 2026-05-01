import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class BackgroundCheckSetupSessionDto {
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'successUrl must be a valid URL' })
  successUrl: string;

  @IsString()
  @IsUrl({ require_tld: false }, { message: 'cancelUrl must be a valid URL' })
  cancelUrl: string;
}

export class BackgroundCheckSetupSuccessDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

export class BackgroundCheckBillingPortalDto {
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'returnUrl must be a valid URL' })
  returnUrl: string;
}
