import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, concatMap, map } from 'rxjs/operators';
import { MeritopService } from './meritop.service';
import { TokenStoreService } from 'src/app/shared/services/token-store.service';
import {
  MeritopClientIdentity,
  resolveMeritopClientIdentity,
} from '../utils/meritop-identity.util';

export const MERITOP_SUMMARY_CACHE_KEY = 'meritop_summary_v1';
export const PENDING_ORDERS_CACHE_KEY = 'pending_orders_v1';

export type MeritopSummaryCache = {
  limit: number;
  available: number;
  amount_used: number;
  cardnumber: string;
  credit_pay_before?: string;
  id: string;
  receiving_account: unknown;
  amount_share_to_pay?: number;
  amount_share_to_pay_converted?: number;
  min_pay?: number;
  minimum_payment?: number;
  share_to_pay?: number;
};

@Injectable({ providedIn: 'root' })
export class MeritopSummaryCacheService {
  private meritopService = inject(MeritopService);
  private tokenStore = inject(TokenStoreService);

  toNumber(value: unknown): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      const normalized = trimmed.includes(',')
        ? trimmed.replace(/\./g, '').replace(',', '.')
        : trimmed;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  buildFromProduct(product: unknown): MeritopSummaryCache | null {
    if (!product || typeof product !== 'object') return null;
    const p = product as Record<string, unknown>;
    const limit = this.toNumber(p['limit'] ?? 0);
    const available = this.toNumber(p['available'] ?? 0);
    if (limit <= 0) return null;
    return {
      limit,
      available,
      amount_used: this.toNumber(p['amount_used'] ?? p['present_debt_amt'] ?? 0),
      cardnumber: String(p['cardnumber'] ?? ''),
      credit_pay_before: p['credit_pay_before'] != null ? String(p['credit_pay_before']) : undefined,
      id: p['id'] != null ? String(p['id']) : '',
      receiving_account: p['receiving_account'] ?? null,
      amount_share_to_pay:
        p['amount_share_to_pay'] != null ? this.toNumber(p['amount_share_to_pay']) : undefined,
      amount_share_to_pay_converted:
        p['amount_share_to_pay_converted'] != null
          ? this.toNumber(p['amount_share_to_pay_converted'])
          : undefined,
      min_pay: p['min_pay'] != null ? this.toNumber(p['min_pay']) : undefined,
      minimum_payment: p['minimum_payment'] != null ? this.toNumber(p['minimum_payment']) : undefined,
      share_to_pay: p['share_to_pay'] != null ? this.toNumber(p['share_to_pay']) : undefined,
    };
  }

  persistFromProduct(product: unknown): MeritopSummaryCache | null {
    const summary = this.buildFromProduct(product);
    if (!summary) return null;
    try {
      sessionStorage.setItem(MERITOP_SUMMARY_CACHE_KEY, JSON.stringify(summary));
    } catch {
      // noop
    }
    return summary;
  }

  read(): MeritopSummaryCache | null {
    try {
      const raw = sessionStorage.getItem(MERITOP_SUMMARY_CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      const limit = this.toNumber(cached?.limit ?? 0);
      if (limit <= 0) return null;
      return {
        limit,
        available: this.toNumber(cached?.available ?? 0),
        amount_used: this.toNumber(cached?.amount_used ?? cached?.present_debt_amt ?? 0),
        cardnumber: String(cached?.cardnumber ?? ''),
        credit_pay_before: cached?.credit_pay_before != null ? String(cached.credit_pay_before) : undefined,
        id: cached?.id != null ? String(cached.id) : '',
        receiving_account: cached?.receiving_account ?? null,
        amount_share_to_pay:
          cached?.amount_share_to_pay != null ? this.toNumber(cached.amount_share_to_pay) : undefined,
        amount_share_to_pay_converted:
          cached?.amount_share_to_pay_converted != null
            ? this.toNumber(cached.amount_share_to_pay_converted)
            : undefined,
        min_pay: cached?.min_pay != null ? this.toNumber(cached.min_pay) : undefined,
        minimum_payment:
          cached?.minimum_payment != null ? this.toNumber(cached.minimum_payment) : undefined,
        share_to_pay: cached?.share_to_pay != null ? this.toNumber(cached.share_to_pay) : undefined,
      };
    } catch {
      return null;
    }
  }

  persistPendingOrders(orders: unknown[]): void {
    try {
      sessionStorage.setItem(PENDING_ORDERS_CACHE_KEY, JSON.stringify(orders));
    } catch {
      // noop
    }
  }

  readPendingOrders(): unknown[] {
    try {
      const raw = sessionStorage.getItem(PENDING_ORDERS_CACHE_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  /** Refresca `customer/products`, persiste caché y devuelve el producto crudo. */
  refreshFromServer$(identity?: MeritopClientIdentity | null): Observable<unknown | null> {
    const resolved =
      identity ??
      resolveMeritopClientIdentity({ accessToken: this.tokenStore.getAccessTokenSync() });
    if (!resolved) {
      return of(null);
    }
    const payload = {
      bank: '94932663-923d-48a3-b13a-6b0bea8f3608',
      channel: 'eea602fb-749e-460a-9805-9f993fc0036a',
      terminal: '0',
      ip: '127.0.0.1',
      clientid: resolved,
    };
    return this.meritopService.getAccessToken().pipe(
      concatMap(() => this.meritopService.customerProduct(payload)),
      map((result: { products?: unknown[] }) => {
        const product = result?.products?.[0];
        if (!product) return null;
        this.persistFromProduct(product);
        return product;
      }),
      catchError(() => of(null))
    );
  }
}
