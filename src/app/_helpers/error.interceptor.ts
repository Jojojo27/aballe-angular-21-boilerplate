import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AccountService } from '@app/_services';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private accountService: AccountService) { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        this.accountService.logout();
      }

      const errorMessage = error.error?.message || error.statusText || 'An error occurred';
      return throwError(() => errorMessage);
    }));
  }
}
