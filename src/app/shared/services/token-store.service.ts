import { Injectable } from '@angular/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const TOKEN_EXP_KEY = 'auth_token_exp';

@Injectable({ providedIn: 'root' })
export class TokenStoreService {
  private accessTokenCache: string | null = null;
  private expirationCache: number | null = null;

  async init(): Promise<void> {
    try {
      this.accessTokenCache = await SecureStorage.getItem(ACCESS_TOKEN_KEY);
      const rawExp = await SecureStorage.getItem(TOKEN_EXP_KEY);
      this.expirationCache = rawExp ? Number(rawExp) : null;
      if (this.expirationCache != null && Number.isNaN(this.expirationCache)) {
        this.expirationCache = null;
      }
    } catch {
      this.accessTokenCache = null;
      this.expirationCache = null;
    }
  }

  getAccessTokenSync(): string | null {
    return this.accessTokenCache;
  }

  getExpirationSync(): number | null {
    return this.expirationCache;
  }

  async setSession(token: string, expirationTime: number | null): Promise<void> {
    this.accessTokenCache = token || null;
    this.expirationCache = expirationTime ?? null;
    try {
      if (this.accessTokenCache) {
        await SecureStorage.setItem(ACCESS_TOKEN_KEY, this.accessTokenCache);
      } else {
        await SecureStorage.removeItem(ACCESS_TOKEN_KEY);
      }
      if (this.expirationCache != null) {
        await SecureStorage.setItem(TOKEN_EXP_KEY, String(this.expirationCache));
      } else {
        await SecureStorage.removeItem(TOKEN_EXP_KEY);
      }
    } catch {
      // noop - cache keeps current session for this runtime.
    }
  }

  async clearSession(): Promise<void> {
    this.accessTokenCache = null;
    this.expirationCache = null;
    try {
      await SecureStorage.removeItem(ACCESS_TOKEN_KEY);
      await SecureStorage.removeItem(TOKEN_EXP_KEY);
    } catch {
      // noop
    }
  }
}

