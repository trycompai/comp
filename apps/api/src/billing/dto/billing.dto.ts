import { subscriptionBillingSkuKeys } from '@trycompai/billing';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';
import { billingTaxIdTypes } from '../billing-preferences';

export class BillingSetupSessionDto {
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'successUrl must be a valid URL' })
  successUrl: string;

  @IsString()
  @IsUrl({ require_tld: false }, { message: 'cancelUrl must be a valid URL' })
  cancelUrl: string;
}

export class BillingSetupSuccessDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

export class BillingPortalDto {
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'returnUrl must be a valid URL' })
  returnUrl: string;
}

export class BillingSubscriptionCheckoutDto {
  @IsString()
  @IsIn(subscriptionBillingSkuKeys)
  skuKey: string;

  @IsString()
  @IsUrl({ require_tld: false }, { message: 'successUrl must be a valid URL' })
  successUrl: string;

  @IsString()
  @IsUrl({ require_tld: false }, { message: 'cancelUrl must be a valid URL' })
  cancelUrl: string;
}

export class BillingPreferencesDto {
  @IsString()
  @Length(1, 150)
  companyName: string;

  @IsEmail()
  billingEmail: string;

  @IsOptional()
  @IsString()
  @Length(0, 140)
  purchaseOrder: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  addressLine1: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  addressLine2: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  addressCity: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  addressState: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 32)
  addressPostalCode: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 2)
  addressCountry: string | null;

  @IsOptional()
  @IsString()
  @IsIn([...billingTaxIdTypes, ''])
  taxIdType: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 64)
  taxIdValue: string | null;
}
