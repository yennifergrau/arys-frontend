import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { UserAccessService } from 'src/app/routes/admin/services/user-access.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private auth = inject(AuthService);
  private access = inject(UserAccessService);

  readonly isLoggingOut = signal(false);

  logout(): void {
    if (this.isLoggingOut()) return;
    this.isLoggingOut.set(true);

    try {
      this.access.clear();
      this.auth.clearSession();
      this.clearAllStorage();
    } catch {
      // noop
    }

    // Deja pintar el overlay antes del reload completo a /login
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          window.location.replace('/login');
        } catch {
          window.location.href = '/login';
        }
      }, 0);
    });
  }

  private clearAllStorage(): void {
    const hardClear = (s: Storage) => {
      try {
        const keys: string[] = [];
        for (let i = 0; i < s.length; i++) {
          const k = s.key(i);
          if (k) keys.push(k);
        }
        keys.forEach(k => {
          try {
            s.removeItem(k);
          } catch {
            // noop
          }
        });
        try {
          s.clear();
        } catch {
          // noop
        }
      } catch {
        // noop
      }
    };

    hardClear(sessionStorage);
    hardClear(localStorage);

    [
      'accessToken',
      'arys_access_state_v1',
      'id_member',
      'meritop_summary_v1',
      'pending_orders_v1',
      'tokenExpirationTime',
    ].forEach(k => {
      try {
        sessionStorage.removeItem(k);
      } catch {
        // noop
      }
    });
    ['data_user', 'userData'].forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch {
        // noop
      }
    });
  }
}
