import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { TextractClient } from '@aws-sdk/client-textract'
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { enableProdMode } from '@angular/core';

if(environment.production){
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});

const textractClient = new TextractClient({
  region: environment.awsConfig.region,
  credentials: {
    accessKeyId: environment.awsConfig.credentials.accessKeyId,
    secretAccessKey: environment.awsConfig.credentials.secretAccessKey
  }
});