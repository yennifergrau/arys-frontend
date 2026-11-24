import { Injectable } from '@angular/core';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import {
  AndroidBiometryStrength,
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
  BiometryType,
} from '@aparajita/capacitor-biometric-auth';
import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage';

const BIOMETRIC_CREDENTIALS_KEY = 'biometric_login_credentials_v1';
const SKIP_AUTO_PROMPT_SESSION_KEY = 'arys_skip_auto_biometric_once';

export interface BiometricAvailability {
  isAvailable: boolean;
  biometryType: BiometryType;
  label: string;
  isFace: boolean;
}

export interface StoredBiometricCredentials {
  email: string;
  password: string;
}

export type BiometricAuthResult =
  | { status: 'success'; credentials: StoredBiometricCredentials }
  | { status: 'cancelled' }
  | { status: 'lockout'; message: string }
  | { status: 'error'; message: string };

@Injectable({ providedIn: 'root' })
export class BiometricAuthService {
  /**
   * Verifica si el dispositivo es nativo (Android/iOS) y tiene biometría configurada.
   */
  async checkAvailability(): Promise<BiometricAvailability> {
    if (!Capacitor.isNativePlatform()) {
      return {
        isAvailable: false,
        biometryType: BiometryType.none,
        label: 'Huella dactilar',
        isFace: false,
      };
    }

    try {
      const result = await BiometricAuth.checkBiometry();
      const type = result.biometryType;
      const isFace =
        type === BiometryType.faceId || type === BiometryType.faceAuthentication;

      const isStrongAvailable = result.strongBiometryIsAvailable ?? result.isAvailable;

      return {
        isAvailable: isStrongAvailable,
        biometryType: type,
        label: this.resolveBiometryLabel(type),
        isFace,
      };
    } catch {
      return {
        isAvailable: false,
        biometryType: BiometryType.none,
        label: 'Huella dactilar',
        isFace: false,
      };
    }
  }

  /**
   * Devuelve únicamente el correo vinculado con biometría (sin exponer la contraseña).
   */
  async getEnrolledEmail(): Promise<string | null> {
    const stored = await this.readStoredRecord();
    return stored?.email ? stored.email : null;
  }

  /**
   * Solicita verificación biométrica al usuario para confirmar el sensor y guarda
   * las credenciales cifradas en Keychain (iOS) / Keystore (Android) solo en este dispositivo.
   */
  async enrollWithConfirmation(
    email: string,
    password: string,
    label = 'Huella dactilar'
  ): Promise<{ enrolled: boolean; cancelled?: boolean; message?: string }> {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      return { enrolled: false, message: 'Credenciales incompletas.' };
    }

    try {
      await BiometricAuth.authenticate({
        reason: `Confirma tu ${label.toLowerCase()} para activar el inicio rápido`,
        cancelTitle: 'Cancelar',
        allowDeviceCredential: false,
        iosFallbackTitle: '',
        androidTitle: 'Activar acceso biométrico',
        androidSubtitle: cleanEmail,
        androidConfirmationRequired: false,
        androidBiometryStrength: AndroidBiometryStrength.strong,
      });

      await this.saveStoredRecord({ email: cleanEmail, password });
      return { enrolled: true };
    } catch (error) {
      const parsed = this.parseBiometryError(error);
      if (parsed.cancelled) {
        return { enrolled: false, cancelled: true };
      }
      return { enrolled: false, message: parsed.message };
    }
  }

  /**
   * Si el usuario ya tenía biometría activa para este mismo correo e inicia sesión
   * manualmente (por ejemplo tras cambiar su contraseña), sincroniza la contraseña cifrada.
   */
  async syncCredentialsIfEnrolled(email: string, password: string): Promise<void> {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) return;

    const existing = await this.readStoredRecord();
    if (!existing?.email) return;

    if (existing.email.toLowerCase() === cleanEmail.toLowerCase()) {
      await this.saveStoredRecord({ email: cleanEmail, password });
    }
  }

  /**
   * Solicita la huella / Face ID y, solo tras validación exitosa del sistema operativo,
   * devuelve las credenciales cifradas para autenticar contra el servidor.
   */
  async authenticateAndGetCredentials(label = 'Huella dactilar'): Promise<BiometricAuthResult> {
    const stored = await this.readStoredRecord();
    if (!stored) {
      return {
        status: 'error',
        message: 'No hay credenciales biométricas guardadas.',
      };
    }

    try {
      await BiometricAuth.authenticate({
        reason: `Usa tu ${label.toLowerCase()} para ingresar a Arys`,
        cancelTitle: 'Usar contraseña',
        allowDeviceCredential: false,
        iosFallbackTitle: '',
        androidTitle: 'Iniciar sesión en Arys',
        androidSubtitle: stored.email,
        androidConfirmationRequired: false,
        androidBiometryStrength: AndroidBiometryStrength.strong,
      });

      return {
        status: 'success',
        credentials: stored,
      };
    } catch (error) {
      const parsed = this.parseBiometryError(error);
      if (parsed.cancelled) {
        return { status: 'cancelled' };
      }
      if (parsed.lockout) {
        return { status: 'lockout', message: parsed.message };
      }
      return { status: 'error', message: parsed.message };
    }
  }

  /**
   * Elimina las credenciales biométricas almacenadas (p. ej. cambio de cuenta o contraseña inválida).
   */
  async clearCredentials(): Promise<void> {
    try {
      await SecureStorage.remove(BIOMETRIC_CREDENTIALS_KEY, false);
    } catch {
      // noop
    }
  }

  /**
   * Marca que el usuario acaba de cerrar sesión manualmente para no disparar
   * el lector biométrico automáticamente en ese instante.
   */
  markManualLogout(): void {
    try {
      sessionStorage.setItem(SKIP_AUTO_PROMPT_SESSION_KEY, '1');
    } catch {
      // noop
    }
  }

  /**
   * Consume la bandera de cierre de sesión manual. Devuelve true si debe omitirse
   * la apertura automática del lector en esta visita a /login.
   */
  consumeSkipAutoPrompt(): boolean {
    try {
      const flag = sessionStorage.getItem(SKIP_AUTO_PROMPT_SESSION_KEY);
      if (flag === '1') {
        sessionStorage.removeItem(SKIP_AUTO_PROMPT_SESSION_KEY);
        return true;
      }
    } catch {
      // noop
    }
    return false;
  }

  /**
   * Escucha cambios en la disponibilidad biométrica cuando la aplicación vuelve al primer plano.
   */
  async addResumeListener(onResume: () => void): Promise<PluginListenerHandle | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }
    try {
      await BiometricAuth.checkBiometry();
      return await BiometricAuth.addResumeListener(() => {
        onResume();
      });
    } catch {
      return null;
    }
  }

  private resolveBiometryLabel(type: BiometryType): string {
    switch (type) {
      case BiometryType.faceId:
        return 'Face ID';
      case BiometryType.touchId:
        return 'Touch ID';
      case BiometryType.faceAuthentication:
        return 'Reconocimiento facial';
      case BiometryType.fingerprintAuthentication:
      default:
        return 'Huella dactilar';
    }
  }

  private async readStoredRecord(): Promise<StoredBiometricCredentials | null> {
    try {
      const data = await SecureStorage.get(BIOMETRIC_CREDENTIALS_KEY, false, false);
      if (
        data &&
        typeof data === 'object' &&
        !Array.isArray(data) &&
        !(data instanceof Date)
      ) {
        const email = typeof data['email'] === 'string' ? data['email'].trim() : '';
        const password = typeof data['password'] === 'string' ? data['password'] : '';
        if (email && password) {
          return { email, password };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private async saveStoredRecord(credentials: StoredBiometricCredentials): Promise<void> {
    await SecureStorage.set(
      BIOMETRIC_CREDENTIALS_KEY,
      { email: credentials.email, password: credentials.password },
      false,
      false,
      KeychainAccess.whenUnlockedThisDeviceOnly
    );
  }

  private parseBiometryError(error: unknown): {
    cancelled: boolean;
    lockout: boolean;
    message: string;
  } {
    const code =
      error instanceof BiometryError
        ? error.code
        : typeof (error as any)?.code === 'string'
          ? ((error as any).code as BiometryErrorType)
          : BiometryErrorType.none;

    if (
      code === BiometryErrorType.userCancel ||
      code === BiometryErrorType.systemCancel ||
      code === BiometryErrorType.appCancel ||
      code === BiometryErrorType.userFallback
    ) {
      return { cancelled: true, lockout: false, message: '' };
    }

    if (code === BiometryErrorType.biometryLockout) {
      return {
        cancelled: false,
        lockout: true,
        message: 'Biometría bloqueada temporalmente. Inicia sesión con tu contraseña.',
      };
    }

    if (
      code === BiometryErrorType.biometryNotAvailable ||
      code === BiometryErrorType.biometryNotEnrolled
    ) {
      return {
        cancelled: false,
        lockout: false,
        message: 'La biometría no está configurada en este dispositivo.',
      };
    }

    return {
      cancelled: false,
      lockout: false,
      message: 'No se pudo verificar tu identidad biométrica.',
    };
  }
}
