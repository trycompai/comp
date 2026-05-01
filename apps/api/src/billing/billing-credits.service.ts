import { BadRequestException, Injectable } from '@nestjs/common';
import { db } from '@db';
import type { BillingProductKey, BillingSkuKey } from '@trycompai/billing';
import { isUniqueConstraintError } from './billing-entitlements.types';
import {
  assertProductKey,
  type BillingCreditBalanceSummary,
  type BillingCreditEventSummary,
  validateCreditInput,
} from './billing-credits.types';

@Injectable()
export class BillingCreditsService {
  async listBalances(
    organizationId: string,
  ): Promise<BillingCreditBalanceSummary[]> {
    const balances = await db.billingCreditBalance.findMany({
      where: { organizationId },
      orderBy: [{ productKey: 'asc' }, { createdAt: 'asc' }],
    });
    return balances.map((balance) => ({
      id: balance.id,
      productKey: assertProductKey(balance.productKey),
      skuKey: balance.skuKey,
      balance: balance.balance,
      totalGranted: balance.totalGranted,
      totalConsumed: balance.totalConsumed,
      totalRefunded: balance.totalRefunded,
      lastSource: balance.lastSource,
      updatedAt: balance.updatedAt.toISOString(),
    }));
  }

  async listEvents(params: {
    organizationId: string;
    take?: number;
  }): Promise<BillingCreditEventSummary[]> {
    const events = await db.billingCreditEvent.findMany({
      where: { organizationId: params.organizationId },
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 50,
    });
    return events.map((event) => ({
      id: event.id,
      productKey: assertProductKey(event.productKey),
      skuKey: event.skuKey,
      eventType: event.eventType,
      quantity: event.quantity,
      source: event.source,
      note: event.note,
      adminUserId: event.adminUserId,
      sourceResourceId: event.sourceResourceId,
      createdAt: event.createdAt.toISOString(),
    }));
  }

  async grant(params: {
    organizationId: string;
    productKey: BillingProductKey;
    skuKey?: BillingSkuKey | null;
    quantity: number;
    source: string;
    note: string;
    adminUserId?: string | null;
    idempotencyKey?: string;
  }): Promise<BillingCreditBalanceSummary> {
    validateCreditInput(params);
    const balance = await this.findOrCreateBalance({
      organizationId: params.organizationId,
      productKey: params.productKey,
      skuKey: params.skuKey ?? null,
    });
    const idempotencyKey =
      params.idempotencyKey ??
      [
        'grant',
        params.organizationId,
        params.productKey,
        params.skuKey ?? 'product',
        params.quantity,
        params.note.trim().toLowerCase(),
      ].join(':');

    try {
      await db.$transaction(async (tx) => {
        await tx.billingCreditEvent.create({
          data: {
            organizationId: params.organizationId,
            balanceId: balance.id,
            productKey: params.productKey,
            skuKey: params.skuKey ?? null,
            eventType: 'grant',
            quantity: params.quantity,
            source: params.source,
            note: params.note.trim(),
            adminUserId: params.adminUserId ?? null,
            idempotencyKey,
          },
        });
        await tx.billingCreditBalance.update({
          where: { id: balance.id },
          data: {
            balance: { increment: params.quantity },
            totalGranted: { increment: params.quantity },
            lastSource: params.source,
          },
        });
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }

    return this.getBalance(balance.id);
  }

  async tryConsumeForProduct(params: {
    organizationId: string;
    productKey: BillingProductKey;
    sourceResourceId: string;
  }): Promise<{ status: 'consumed' | 'not_configured' | 'exhausted' }> {
    const existing = await db.billingCreditBalance.findMany({
      where: {
        organizationId: params.organizationId,
        productKey: params.productKey,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (existing.length === 0) return { status: 'not_configured' };

    const balance = existing.find((item) => item.balance > 0);
    if (!balance) return { status: 'exhausted' };

    const idempotencyKey = [
      'credit-consume',
      params.organizationId,
      params.productKey,
      params.sourceResourceId,
    ].join(':');

    try {
      await db.$transaction(async (tx) => {
        await tx.billingCreditEvent.create({
          data: {
            organizationId: params.organizationId,
            balanceId: balance.id,
            productKey: params.productKey,
            skuKey: balance.skuKey,
            eventType: 'consume',
            quantity: 1,
            source: 'manual_credit',
            sourceResourceId: params.sourceResourceId,
            idempotencyKey,
          },
        });
        const updated = await tx.billingCreditBalance.updateMany({
          where: { id: balance.id, balance: { gt: 0 } },
          data: {
            balance: { decrement: 1 },
            totalConsumed: { increment: 1 },
          },
        });
        if (updated.count === 0) {
          throw new BadRequestException('Credit balance is exhausted.');
        }
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) return { status: 'consumed' };
      throw error;
    }

    return { status: 'consumed' };
  }

  async refundForProduct(params: {
    organizationId: string;
    productKey: BillingProductKey;
    sourceResourceId: string;
    reason: string;
  }): Promise<boolean> {
    const consumed = await db.billingCreditEvent.findFirst({
      where: {
        organizationId: params.organizationId,
        productKey: params.productKey,
        eventType: 'consume',
        sourceResourceId: params.sourceResourceId,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!consumed) return false;

    const idempotencyKey = [
      'credit-refund',
      params.organizationId,
      params.productKey,
      params.sourceResourceId,
      params.reason,
    ].join(':');

    try {
      await db.$transaction(async (tx) => {
        await tx.billingCreditEvent.create({
          data: {
            organizationId: params.organizationId,
            balanceId: consumed.balanceId,
            productKey: params.productKey,
            skuKey: consumed.skuKey,
            eventType: 'refund',
            quantity: consumed.quantity,
            source: 'refund',
            note: params.reason,
            sourceResourceId: params.sourceResourceId,
            linkedEventId: consumed.id,
            idempotencyKey,
          },
        });
        await tx.billingCreditBalance.update({
          where: { id: consumed.balanceId },
          data: {
            balance: { increment: consumed.quantity },
            totalRefunded: { increment: consumed.quantity },
            totalConsumed: { decrement: consumed.quantity },
            lastSource: 'refund',
          },
        });
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }

    return true;
  }

  private async findOrCreateBalance(params: {
    organizationId: string;
    productKey: BillingProductKey;
    skuKey: BillingSkuKey | null;
  }) {
    const existing = await db.billingCreditBalance.findFirst({
      where: {
        organizationId: params.organizationId,
        productKey: params.productKey,
        skuKey: params.skuKey,
      },
    });
    if (existing) return existing;

    try {
      return await db.billingCreditBalance.create({
        data: {
          organizationId: params.organizationId,
          productKey: params.productKey,
          skuKey: params.skuKey,
          lastSource: 'manual',
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      return db.billingCreditBalance.findFirstOrThrow({
        where: {
          organizationId: params.organizationId,
          productKey: params.productKey,
          skuKey: params.skuKey,
        },
      });
    }
  }

  private async getBalance(id: string): Promise<BillingCreditBalanceSummary> {
    const balance = await db.billingCreditBalance.findUniqueOrThrow({
      where: { id },
    });
    return {
      id: balance.id,
      productKey: assertProductKey(balance.productKey),
      skuKey: balance.skuKey,
      balance: balance.balance,
      totalGranted: balance.totalGranted,
      totalConsumed: balance.totalConsumed,
      totalRefunded: balance.totalRefunded,
      lastSource: balance.lastSource,
      updatedAt: balance.updatedAt.toISOString(),
    };
  }
}
