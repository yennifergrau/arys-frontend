import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';


@Component({
  selector: 'app-tab',
  templateUrl: './tab.component.html',
  styleUrls: ['./tab.component.scss'],
  standalone:true,
  imports:[CommonModule,RouterLink]
})
export class TabComponent  {

  constructor(public router: Router) {}

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }
  
  goTo(route: string) {
    this.router.navigate([route]);
  }
}
