import { Routes } from '@angular/router';
import { LoginPage } from './login/login.page';
import { RegisterPage } from './register/register.page';
import { ForgotPasswordPage } from './forgot-password/forgot-password.page';
import { RestorePasswordPage } from './restore-password/restore-password.page';

export const PUBLIC_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginPage,
  },
  {
    path: 'register',
    component: RegisterPage,
  },
  {
    path:'forgot-password',
    component:ForgotPasswordPage
  },
  {
    path:'restore-password/user/:email',
    component:RestorePasswordPage
  }
];
