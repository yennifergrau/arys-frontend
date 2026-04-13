import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { environment } from 'src/environments/environment';

/** Rutas admin que muestran <app-tab /> (el FAB debe quedar encima de esa barra). */
const ADMIN_PATHS_WITH_TAB = new Set<string>([
  'commerce/sarys/data',
  'financiamiento/purchase/add/payment',
  'my-shopping',
  'customer/payment/purchased',
  'purchase/recipe',
  'report/credit/payment',
  'membresia/user',
  'shared/membership/user/sarys',
  'movimientos',
  'pagar-deuda',
  'service-orders/pending',
]);

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  readonly whatsappServiceUrl = AppComponent.buildWhatsappUrl();

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** true = barra inferior fija (tabs); el FAB sigue “abajo” pero encima de esa barra */
  fabAboveBottomNav = false;

  private static buildWhatsappUrl(): string | null {
    const raw = environment.contact?.whatsappPhone ?? '';
    const phone = raw.replace(/\D/g, '');
    if (phone.length < 10) {
      return null;
    }
    const msg = environment.contact?.whatsappServiceMessage ?? '';
    const text = encodeURIComponent(msg);
    return `https://wa.me/${phone}?text=${text}`;
  }

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.syncFabPlacement());
  }

  ngOnInit() {
    this.syncFabPlacement();
    document.addEventListener(
      'touchstart',
      (event) => {
      },
      { passive: true }
    );
  }

  private syncFabPlacement(): void {
    const path = this.router.url.split('?')[0];
    this.fabAboveBottomNav = AppComponent.pathHasAdminTabBar(path);
  }

  private static pathHasAdminTabBar(fullPath: string): boolean {
    if (!fullPath.startsWith('/admin/')) {
      return false;
    }
    const rest = fullPath.slice('/admin/'.length).replace(/\/$/, '');
    if (!rest) {
      return false;
    }
    for (const prefix of ADMIN_PATHS_WITH_TAB) {
      if (rest === prefix || rest.startsWith(prefix + '/')) {
        return true;
      }
    }
    return false;
  }
}
