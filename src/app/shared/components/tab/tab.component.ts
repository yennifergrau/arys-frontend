import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserAccessService } from 'src/app/routes/admin/services/user-access.service';


@Component({
  selector: 'app-tab',
  templateUrl: './tab.component.html',
  styleUrls: ['./tab.component.scss'],
  standalone:true,
  imports:[CommonModule,RouterLink]
})
export class TabComponent  {

  constructor(
    public router: Router,
    private access: UserAccessService
  ) {
    // No bloquea la UI; solo prepara flags para ocultar tabs.
    void this.access.ensureLoaded();
  }

  get hasCreditLine(): boolean {
    return this.access.state.hasCreditLine;
  }

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }
  
  goTo(route: string) {
    this.router.navigate([route]);
  }

  logout(ev?: Event): void {
    try {
      ev?.preventDefault();
      ev?.stopPropagation();
    } catch {
      // noop
    }

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

    // Respaldo explícito para llaves reportadas
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

    // Redirección hard para evitar rehidratación del estado
    try {
      window.location.replace('/login');
      return;
    } catch {
      // noop
    }
    window.location.href = '/login';
  }
}
