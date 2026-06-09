import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { TokenStoreService } from 'src/app/shared/services/token-store.service';

const isValidJwtInSession = (): boolean => {
  const token = inject(TokenStoreService).getAccessTokenSync();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    const expMs = Number(payload?.exp || 0) * 1000;
    if (!expMs) return false;
    return Date.now() < expMs;
  } catch {
    return false;
  }
};

const redirectToLogin = () => inject(Router).parseUrl('/login');

export const adminAuthGuard: CanActivateFn = () => {
  return isValidJwtInSession() ? true : redirectToLogin();
};

export const adminAuthChildGuard: CanActivateChildFn = () => {
  return isValidJwtInSession() ? true : redirectToLogin();
};

