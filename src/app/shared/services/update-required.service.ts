import { Injectable, inject } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { environment } from 'src/environments/environment';

export interface StoreLinks {
  apkUrl?: string;
  playStoreUrl?: string;
  appStoreUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class UpdateRequiredService {
  private alertCtrl = inject(AlertController);
  private isOpen = false;

  async present(customUrlOrLinks?: string | StoreLinks, message?: string): Promise<void> {
    if (this.isOpen) return;
    this.isOpen = true;

    const links: StoreLinks =
      typeof customUrlOrLinks === 'string'
        ? { apkUrl: customUrlOrLinks }
        : customUrlOrLinks || {};

    const text =
      (message || '').trim() || 'Debes actualizar la aplicación para continuar.';

    const alert = await this.alertCtrl.create({
      header: 'Actualización requerida',
      message: text,
      backdropDismiss: false,
      buttons: [
        {
          text: 'Actualizar',
          handler: () => {
            this.redirectToStore(links);
            return false;
          },
        },
      ],
    });

    alert.onDidDismiss().then(() => {
      this.isOpen = false;
    });

    await alert.present();
  }

  public redirectToStore(links?: StoreLinks): void {
    const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'
    const stores = (environment as any).stores || {};

    if (platform === 'android') {
      const playStoreWebUrl =
        links?.playStoreUrl ||
        stores.playStoreUrl ||
        'https://play.google.com/store/apps/details?id=finanziamiento.arys';
      const marketUri = stores.playStoreMarketUri || 'market://details?id=finanziamiento.arys';

      try {
        if (Capacitor.isNativePlatform()) {
          // Abre directamente la aplicación de Google Play Store
          window.open(marketUri, '_system');
        } else {
          window.open(playStoreWebUrl, '_blank');
        }
      } catch {
        window.open(playStoreWebUrl, '_system');
      }
      return;
    }

    if (platform === 'ios') {
      const appStoreUrl = links?.appStoreUrl || stores.appStoreUrl;
      if (appStoreUrl) {
        try {
          window.open(appStoreUrl, '_system');
        } catch {
          window.open(appStoreUrl, '_blank');
        }
        return;
      }

      // Si aún no está publicada en la App Store de iOS
      const fallbackUrl = links?.apkUrl || environment.downloadMobileAppLink;
      if (fallbackUrl) {
        window.open(fallbackUrl, '_system');
      }
      return;
    }

    // Web u otras plataformas
    const webUrl =
      links?.playStoreUrl ||
      stores.playStoreUrl ||
      links?.apkUrl ||
      environment.downloadMobileAppLink ||
      '';
    if (webUrl) {
      window.open(webUrl, '_blank');
    }
  }
}
