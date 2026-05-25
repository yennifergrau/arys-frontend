import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserAccessService } from 'src/app/routes/admin/services/user-access.service';
import { SessionService } from 'src/app/shared/services/session.service';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';


@Component({
  selector: 'app-tab',
  templateUrl: './tab.component.html',
  styleUrls: ['./tab.component.scss'],
  standalone:true,
  imports:[CommonModule, RouterLink, SpinnerComponent]
})
export class TabComponent  {
  public router = inject(Router);
  private access = inject(UserAccessService);
  readonly session = inject(SessionService);

  constructor() {
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
    void this.router.navigateByUrl(route);
  }

  logout(ev?: Event): void {
    try {
      ev?.preventDefault();
      ev?.stopPropagation();
    } catch {
      // noop
    }
    this.session.logout();
  }
}
