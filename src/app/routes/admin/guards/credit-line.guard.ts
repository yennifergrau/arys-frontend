import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserAccessService } from '../services/user-access.service';

/**
 * Reglas:
 * - Sin membresía → enviar a planes (comprar membresía)
 * - Con membresía pero sin línea de crédito → enviar a flujo de apertura de línea
 * - Con línea de crédito → permitir
 */
export const creditLineGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const access = inject(UserAccessService);

  const state = await access.ensureLoaded();

  if (!state.hasMembership) {
    return router.parseUrl('/admin/planes/home/user');
  }
  if (!state.hasCreditLine) {
    return router.parseUrl('/admin/Customer/create/sarys/meritop');
  }
  return true;
};

