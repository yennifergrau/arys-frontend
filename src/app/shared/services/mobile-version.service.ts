import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UpdateRequiredService } from './update-required.service';

export interface MobileConfigResponse {
  status?: boolean;
  latestVersionCode?: number;
  latestVersionName?: string;
  minSupportedVersionCode?: number;
  apkUrl?: string;
  forceUpdate?: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class MobileVersionService {
  private http = inject(HttpClient);
  private updateRequired = inject(UpdateRequiredService);

  private blocked = false;
  private config: MobileConfigResponse | null = null;

  getVersionCodeSync(): number {
    return Number(environment.appVersionCode || 0);
  }

  get isBlocked(): boolean {
    return this.blocked;
  }

  /**
   * Consulta remota al iniciar (APP_INITIALIZER).
   * Si falla la red, no bloquea: el interceptor + 426 actúan como respaldo.
   */
  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    await this.fetchAndEvaluate();
  }

  /** Muestra modal bloqueante si la versión local está por debajo del mínimo. */
  async presentBlockIfNeeded(): Promise<void> {
    if (!this.blocked || !this.config) {
      return;
    }
    await this.updateRequired.present(
      this.config.apkUrl,
      this.config.message || 'Debes actualizar la aplicación para continuar.'
    );
  }

  private async fetchAndEvaluate(): Promise<void> {
    const current = this.getVersionCodeSync();
    if (current <= 0) {
      return;
    }

    const baseUrl = (environment.authentication || '').replace(/\/$/, '');
    if (!baseUrl) {
      return;
    }

    try {
      const config = await firstValueFrom(
        this.http.get<MobileConfigResponse>(`${baseUrl}/api/mobile/config`)
      );
      this.config = config;

      const min = Number(config?.minSupportedVersionCode || 0);
      if (min > 0 && current < min) {
        this.blocked = true;
      }
    } catch {
      // Sin red o error del servidor: no bloquear arranque; 426 en requests posteriores.
    }
  }
}
