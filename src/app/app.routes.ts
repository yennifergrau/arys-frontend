import { Routes } from '@angular/router';
import { PublicPage } from './routes/public/public.page';
import { AdminPage } from './routes/admin/admin.page';
import { PUBLIC_ROUTES } from './routes/public/public.routes';
import { ADMIN_ROUTES } from './routes/admin/admin.routes';

export const routes: Routes = [
  {
    path: '',
    component: PublicPage,
    children: PUBLIC_ROUTES,
  },
  {
    path: 'admin',
    component: AdminPage,
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
