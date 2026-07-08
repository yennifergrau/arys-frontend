import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, enableProdMode } from '@angular/core';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { TokenStoreService } from './app/shared/services/token-store.service';
import { appVersionInterceptor } from './app/shared/services/app-version.interceptor';
import { MobileVersionService } from './app/shared/services/mobile-version.service';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([appVersionInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: (tokenStore: TokenStoreService) => () => tokenStore.init(),
      deps: [TokenStoreService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (mobileVersion: MobileVersionService) => () => mobileVersion.init(),
      deps: [MobileVersionService],
      multi: true,
    },
  ],
});