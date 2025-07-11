import { STRIPE_SUB_CACHE } from '@/app/api/stripe/stripeDataToKv.type';
import { SubscriptionType } from '@comp/db/types';

export interface PricingCardsProps {
  organizationId: string;
  priceDetails: {
    managedMonthlyPrice: PriceDetail | null;
    managedYearlyPrice: PriceDetail | null;
    starterMonthlyPrice: PriceDetail | null;
    starterYearlyPrice: PriceDetail | null;
  };
  currentSubscription?: STRIPE_SUB_CACHE;
  subscriptionType?: 'NONE' | 'FREE' | 'STARTER' | 'MANAGED';
}

export interface PriceDetail {
  id: string;
  unitAmount: number | null;
  currency: string;
  interval: string | null;
  productName: string | null;
}

export interface PricingCardProps {
  planType: SubscriptionType;
  onCheckoutUpfront: () => void;
  onCheckoutMonthly: () => void;
  title: string;
  description: string;
  annualPrice: number;
  monthlyPrice: number;
  subtitle?: string;
  features: readonly string[];
  badge?: string;
  isExecutingUpfront?: boolean;
  isExecutingMonthly?: boolean;
  isCurrentPlan?: boolean;
  isLoadingSubscription?: boolean;
}

export type PaymentType = 'upfront' | 'monthly';
