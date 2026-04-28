import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, HTTP_INTERCEPTORS } from '@angular/common/http';
import { routes } from './app.routes';
import { ErrorInterceptor, JwtInterceptor, FakeBackendInterceptor, appInitializer } from './_helpers';
import { APP_INITIALIZER } from '@angular/core';
import { AccountService } from './_services';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: FakeBackendInterceptor, multi: true },
    { provide: APP_INITIALIZER, useFactory: appInitializer, deps: [AccountService], multi: true }
  ]
};
