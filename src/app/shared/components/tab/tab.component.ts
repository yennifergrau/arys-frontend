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
}
