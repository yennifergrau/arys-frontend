import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UpdateRequiredService } from './update-required.service';

export const appVersionInterceptor: HttpInterceptorFn = (req, next) => {
  const versionCode = Number(environment.appVersionCode || 0);
  const cloned = versionCode > 0
    ? req.clone({
        setHeaders: {
          'X-App-Version-Code': String(versionCode),
        },
      })
    : req;

  const updateRequired = inject(UpdateRequiredService);
  return next(cloned).pipe(
    catchError((err: unknown) => {
      const httpErr = err as HttpErrorResponse;
      if (httpErr?.status === 426) {
        const body: any = httpErr?.error;
        if (body?.error === 'OUTDATED_APP') {
          void updateRequired.present(body?.apkUrl, body?.message);
        }
      }
      return throwError(() => err);
    })
  );
};

