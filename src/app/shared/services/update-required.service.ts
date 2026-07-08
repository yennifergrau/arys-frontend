import { Injectable, inject } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class UpdateRequiredService {
  private alertCtrl = inject(AlertController);
  private isOpen = false;

  async present(apkUrl?: string, message?: string): Promise<void> {
    if (this.isOpen) return;
    this.isOpen = true;

    const url = (apkUrl || '').trim();
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
            if (!url) return;
            try {
              if (Capacitor.isNativePlatform()) {
                // En WebView suele abrir el navegador/installer según MIME/descarga.
                window.open(url, '_system');
              } else {
                window.open(url, '_blank');
              }
            } catch {
              // noop
            }
          },
        },
      ],
    });

    alert.onDidDismiss().then(() => {
      this.isOpen = false;
    });

    await alert.present();
  }
}

