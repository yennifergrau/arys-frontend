import { Injectable, inject } from '@angular/core';
import { EmissionDetailsService } from './emission-details.service';
import { UserAccessService } from './user-access.service';
import {
  MERITOP_SUMMARY_CACHE_KEY,
  PENDING_ORDERS_CACHE_KEY,
} from './meritop-summary-cache.service';

export const MEMBERSHIP_COUNT_KEY = 'arys_membership_count';

@Injectable({ providedIn: 'root' })
export class MembershipSessionService {
  private readonly emission = inject(EmissionDetailsService);
  private readonly userAccess = inject(UserAccessService);

  getActiveId(): number | null {
    const raw = sessionStorage.getItem('id_member');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  getAvailableCount(): number {
    const n = Number(sessionStorage.getItem(MEMBERSHIP_COUNT_KEY) || 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  rememberAvailableCount(count: number): void {
    const n = Number(count);
    sessionStorage.setItem(MEMBERSHIP_COUNT_KEY, String(Number.isFinite(n) && n > 0 ? n : 0));
  }

  isActive(row: unknown): boolean {
    if (!row || typeof row !== 'object') return false;
    const id = Number((row as Record<string, unknown>)['id_master']);
    return this.getActiveId() === id;
  }

  /**
   * Fija la membresía con la que trabaja el resto de la app (crédito, órdenes, dashboard).
   * Si el id cambia, limpia cachés de Meritop y órdenes pendientes.
   */
  activate(row: unknown): number | null {
    if (!row || typeof row !== 'object') return null;
    const id = Number((row as Record<string, unknown>)['id_master']);
    if (!Number.isFinite(id) || id <= 0) return null;

    const prev = this.getActiveId();
    sessionStorage.setItem('id_member', String(id));
    this.emission.mergeUserDataFromMembership(row);
    if (prev !== id) {
      this.clearRelatedCaches();
    }
    this.userAccess.applyFromMembership(row as Record<string, unknown>);
    return id;
  }

  private clearRelatedCaches(): void {
    try {
      sessionStorage.removeItem(MERITOP_SUMMARY_CACHE_KEY);
      sessionStorage.removeItem(PENDING_ORDERS_CACHE_KEY);
    } catch {
      // noop
    }
  }
}
