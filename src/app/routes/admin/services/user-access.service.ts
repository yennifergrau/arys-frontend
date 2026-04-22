import { inject, Injectable } from '@angular/core';
import { DataArysService } from './data-arys.service';
import { jwtDecode } from 'jwt-decode';
import { firstValueFrom } from 'rxjs';

export type UserAccessState = {
  loaded: boolean;
  hasMembership: boolean;
  hasCreditLine: boolean;
  idMember: number | null;
};

const STORAGE_KEY = 'arys_access_state_v1';

@Injectable({ providedIn: 'root' })
export class UserAccessService {
  private readonly dataArys = inject(DataArysService);

  /**
   * Marca la línea de crédito como activa en sesión para evitar bucles de guard
   * cuando el backend tarda en reflejar `credit_line_id` después de activación.
   */
  markCreditLineActive(idMember?: number | null): void {
    const current = this.state;
    const resolvedId =
      idMember != null && !Number.isNaN(Number(idMember)) ? Number(idMember) : current.idMember;
    const next: UserAccessState = {
      loaded: true,
      hasMembership: current.hasMembership || (resolvedId != null && resolvedId > 0),
      hasCreditLine: true,
      idMember: resolvedId ?? null,
    };
    this.setState(next);
  }

  get state(): UserAccessState {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { loaded: false, hasMembership: false, hasCreditLine: false, idMember: null };
    }
    try {
      const parsed = JSON.parse(raw);
      return {
        loaded: !!parsed.loaded,
        hasMembership: !!parsed.hasMembership,
        hasCreditLine: !!parsed.hasCreditLine,
        idMember: typeof parsed.idMember === 'number' ? parsed.idMember : null,
      };
    } catch {
      return { loaded: false, hasMembership: false, hasCreditLine: false, idMember: null };
    }
  }

  clear(): void {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  private setState(next: UserAccessState): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  private getTokenIdentity(): { id_member?: number; email?: string } {
    try {
      const token = sessionStorage.getItem('accessToken');
      if (!token) return {};
      const decoded: any = jwtDecode(token);
      const id_member =
        decoded?.id_member != null && !Number.isNaN(Number(decoded.id_member))
          ? Number(decoded.id_member)
          : undefined;
      const email = decoded?.email != null ? String(decoded.email).trim() : undefined;
      return { id_member, email };
    } catch {
      return {};
    }
  }

  async ensureLoaded(force = false): Promise<UserAccessState> {
    const current = this.state;
    // Si ya está cargado, normalmente devolvemos caché. Pero si el caché dice "sin membresía"
    // y tenemos un id_member en sesión, reintentamos para evitar redirecciones falsas.
    const stored = sessionStorage.getItem('id_member');
    const storedIdMember = stored && !Number.isNaN(Number(stored)) ? Number(stored) : null;
    if (!force && current.loaded) {
      if (!current.hasMembership && storedIdMember != null && storedIdMember > 0) {
        // Reintento (puede haberse guardado false por un error temporal).
      } else {
        return current;
      }
    }

    const tokenIdentity = this.getTokenIdentity();
    const idMember = storedIdMember ?? tokenIdentity.id_member ?? null;
    const email = tokenIdentity.email ?? null;

    try {
      const res: any =
        idMember != null
          ? await firstValueFrom(this.dataArys.get_membership(idMember))
          : email
            ? await firstValueFrom(this.dataArys.get_membership_by_email(email))
            : null;

      const rows = res?.status && Array.isArray(res.data) ? res.data : [];
      const hasMembership = rows.length > 0;
      const first = rows[0];
      const resolvedIdMember =
        first?.id_master != null && !Number.isNaN(Number(first.id_master))
          ? Number(first.id_master)
          : idMember;

      if (resolvedIdMember != null) {
        sessionStorage.setItem('id_member', String(resolvedIdMember));
      }

      const hasCreditLine = rows.some((r: any) => {
        const id = r?.credit_line_id;
        return id != null && String(id).trim() !== '';
      });

      const next: UserAccessState = {
        loaded: true,
        hasMembership,
        hasCreditLine,
        idMember: resolvedIdMember ?? null,
      };
      this.setState(next);
      return next;
    } catch {
      // Si falla la consulta, NO degradamos permisos a "sin membresía" (evita redirecciones falsas).
      // Preferimos el último estado conocido; si no existe, asumimos solo membresía si hay `id_member` guardado.
      if (current.loaded) {
        return current;
      }
      const fallbackHasMembership = idMember != null && !Number.isNaN(idMember) && idMember > 0;
      const next: UserAccessState = {
        loaded: true,
        hasMembership: fallbackHasMembership,
        hasCreditLine: false,
        idMember,
      };
      this.setState(next);
      return next;
    }
  }
}

