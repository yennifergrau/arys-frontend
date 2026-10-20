import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
// import { AlertController } from '@ionic/angular';
// import { HttpClient } from '@angular/common/http';
// import { firstValueFrom } from 'rxjs';
// import { environment } from 'src/environments/environment';

export interface MonthlyReminderItem {
  day: number;
  notificationId: number;
  title: string;
  message: string;
}

/**
 * Estructura preparada para cuando se habiliten promociones dinámicas desde el backend
 * sin necesidad de actualizar la aplicación.
 */
export interface RemotePromoPopupConfig {
  id: string;
  active: boolean;
  title: string;
  message: string;
  buttonText?: string;
  actionUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class MonthlyReminderService {
  // private alertCtrl = inject(AlertController);
  // private http = inject(HttpClient);

  private readonly SCHEDULE_VERSION_KEY = 'arys_monthly_notifications_v2_8am';

  /** Hora para las notificaciones del teléfono: 8:00 AM */
  private readonly NOTIFICATION_HOUR = 8;
  private readonly NOTIFICATION_MINUTE = 0;

  /**
   * Fechas fijas de cada mes.
   * Cada día (14, 15 y 21) dispara únicamente su propia notificación en el teléfono.
   */
  private readonly MONTHLY_REMINDERS: MonthlyReminderItem[] = [
    {
      day: 14,
      notificationId: 1414,
      title: '14 · Corte',
      message: 'Se cierra tu cuota del mes.',
    },
    {
      day: 15,
      notificationId: 1515,
      title: '15 · Consulta disponible',
      message: 'Ya puedes ver tu monto en la app.',
    },
    {
      day: 21,
      notificationId: 2121,
      title: '21 · Fecha límite de pago',
      message: 'Último día para pagar sin afectar tu servicio.',
    },
  ];

  /**
   * Inicializa únicamente las notificaciones locales mensuales fuera de la app (Android / iOS)
   * a las 8:00 AM de los días 14, 15 y 21.
   */
  async init(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await this.scheduleMonthlyNotifications();
    }

    // =========================================================================
    // FUTURO: Descomentar cuando el backend exponga promociones dinámicas
    // =========================================================================
    // await this.checkRemotePromoPopup();
  }

  /**
   * Programa en el teléfono (Android y iOS) las 3 notificaciones mensuales
   * independientes para los días 14, 15 y 21 a las 8:00 AM.
   */
  private async scheduleMonthlyNotifications(): Promise<void> {
    try {
      let permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display === 'prompt' || permStatus.display === 'prompt-with-rationale') {
        permStatus = await LocalNotifications.requestPermissions();
      }

      if (permStatus.display !== 'granted') {
        return;
      }

      // Evita reprogramar innecesariamente si ya quedaron registradas en esta versión
      if (localStorage.getItem(this.SCHEDULE_VERSION_KEY) === '1') {
        const pending = await LocalNotifications.getPending();
        const pendingIds = new Set(pending.notifications.map((n) => n.id));
        const allScheduled = this.MONTHLY_REMINDERS.every((r) =>
          pendingIds.has(r.notificationId)
        );
        if (allScheduled) {
          return;
        }
      }

      // Limpia notificaciones previas de estos mismos IDs antes de programar
      await LocalNotifications.cancel({
        notifications: this.MONTHLY_REMINDERS.map((r) => ({ id: r.notificationId })),
      });

      await LocalNotifications.schedule({
        notifications: this.MONTHLY_REMINDERS.map((reminder) => ({
          id: reminder.notificationId,
          title: reminder.title,
          body: reminder.message,
          schedule: {
            on: {
              day: reminder.day,
              hour: this.NOTIFICATION_HOUR,
              minute: this.NOTIFICATION_MINUTE,
            },
            allowWhileIdle: true,
          },
          extra: {
            day: reminder.day,
          },
        })),
      });

      localStorage.setItem(this.SCHEDULE_VERSION_KEY, '1');
    } catch {
      // noop: si el dispositivo o plataforma bloquea alarmas locales
    }
  }

  // ===========================================================================
  // SOPORTE PREPARADO PARA PROMOCIONES / AVISOS DINÁMICOS DESDE EL BACKEND
  // (Sin necesidad de actualizar la app en Play Store / App Store)
  // ===========================================================================
  /*
  async checkRemotePromoPopup(): Promise<void> {
    const baseUrl = (environment.authentication || '').replace(/\/$/, '');
    if (!baseUrl) {
      return;
    }

    try {
      // Ejemplo de respuesta esperada del endpoint:
      // {
      //   "id": "promo_verano_2026",
      //   "active": true,
      //   "title": "🎉 ¡Promoción Especial!",
      //   "message": "Paga tu cuota antes del día 18 y participa en nuestro sorteo mensual.",
      //   "buttonText": "Ver detalles",
      //   "actionUrl": "https://poliza.arys.polizaqui.com"
      // }
      const promo = await firstValueFrom(
        this.http.get<RemotePromoPopupConfig>(`${baseUrl}/api/mobile/promotions/active`)
      );

      if (!promo || !promo.active || !promo.id) {
        return;
      }

      const promoStorageKey = `arys_promo_shown_${promo.id}`;
      if (localStorage.getItem(promoStorageKey) === '1') {
        return;
      }

      const buttons: any[] = [
        {
          text: 'Cerrar',
          role: 'cancel',
        },
      ];

      if (promo.actionUrl) {
        buttons.push({
          text: promo.buttonText || 'Ver más',
          handler: () => {
            window.open(
              promo.actionUrl,
              Capacitor.isNativePlatform() ? '_system' : '_blank'
            );
          },
        });
      }

      const alert = await this.alertCtrl.create({
        cssClass: 'arys-monthly-reminder-alert',
        header: promo.title,
        message: promo.message,
        backdropDismiss: true,
        buttons,
      });

      alert.onDidDismiss().then(() => {
        localStorage.setItem(promoStorageKey, '1');
      });

      await alert.present();
    } catch {
      // Si no hay conexión o no existe promoción activa, continúa normalmente.
    }
  }
  */
}
