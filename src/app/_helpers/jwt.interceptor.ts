import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AccountService } from '@app/_services';
import { environment } from '@environments/environment';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private accountService: AccountService) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const account = this.accountService.accountValue;
    const token = account?.jwtToken || account?.accessToken;
    const isLoggedIn = !!token;
    const isApiUrl = request.url.startsWith('/api') || request.url.startsWith(environment.apiUrl);

    if (isLoggedIn && isApiUrl) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request);
  }
}
