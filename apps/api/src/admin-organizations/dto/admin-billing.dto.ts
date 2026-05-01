import { subscriptionBillingSkuKeys } from '@trycompai/billing';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';
import { billingTaxIdTypes } from '../../billing/billing-preferences';

export class AdminBillingPreferencesDto {
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

  @IsOptional()
  @IsBoolean()
  confirmBillingEmailChange?: boolean;

  @IsString()
  @Length(3, 500)
  note: string;
}

export class AdminBillingSubscriptionDto {
  @IsString()
  @IsIn(subscriptionBillingSkuKeys)
  skuKey: string;

  @IsString()
  @IsUrl({ require_tld: false })
  returnUrl: string;

  @IsString()
  @Length(3, 500)
  note: string;

  @IsOptional()
  @IsBoolean()
  confirmDowngrade?: boolean;
}

export class AdminBillingSubscriptionPreviewDto {
  @IsString()
  @IsIn(subscriptionBillingSkuKeys)
  skuKey: string;
}

export class AdminBillingCancelSubscriptionDto {
  @IsIn(['period_end', 'immediate'])
  mode: 'period_end' | 'immediate';

  @IsString()
  @Length(3, 500)
  note: string;

  @IsOptional()
  @IsString()
  confirm?: string;
}

export class AdminBillingNoteDto {
  @IsString()
  @Length(3, 500)
  note: string;
}

export class AdminBillingPaymentLinkDto {
  @IsString()
  @IsUrl({ require_tld: false })
  successUrl: string;

  @IsString()
  @IsUrl({ require_tld: false })
  cancelUrl: string;
}

export class AdminBillingGrantCreditsDto {
  @IsIn(['pentest', 'background_check'])
  productKey: 'pentest' | 'background_check';

  @IsInt()
  @Min(1)
  @Max(1000)
  quantity: number;

  @IsString()
  @Length(3, 500)
  note: string;

  @IsOptional()
  @IsString()
  confirm?: string;
}

export class AdminBillingInvoiceActionDto {
  @IsString()
  @IsNotEmpty()
  note: string;
}
