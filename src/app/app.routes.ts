import { Routes } from '@angular/router';
import { PublicPage } from './routes/public/public.page';
import { AdminPage } from './routes/admin/admin.page';
import { PUBLIC_ROUTES } from './routes/public/public.routes';
import { ADMIN_ROUTES } from './routes/admin/admin.routes';
import { adminAuthChildGuard, adminAuthGuard } from './routes/admin/guards/admin-auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: PublicPage,
    children: PUBLIC_ROUTES,
  },
  {
    path: 'admin',
    component: AdminPage,
    canActivate: [adminAuthGuard],
    canActivateChild: [adminAuthChildGuard],
    children: ADMIN_ROUTES,
  },
  {
    path: 'ui',
    loadComponent: () => import('./shared/ui/ui.page').then( m => m.UiPage)
  },
  {
    path: '',
    redirectTo: '',
    pathMatch: 'full',
  },
];
