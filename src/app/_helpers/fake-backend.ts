import { Injectable } from '@angular/core';
import { HttpRequest, HttpResponse, HttpHandler, HttpEvent, HttpInterceptor, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, mergeMap, materialize, dematerialize } from 'rxjs/operators';
import { Account, Role } from '@app/_models';

const verifyEmailTokens: { [key: string]: string } = {};
const resetPasswordTokens: { [key: string]: string } = {};

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const { url, method, body } = request;
    let accounts: any[] = JSON.parse(localStorage.getItem('accounts') || '[]');

    return of(null).pipe(
      mergeMap(
        () => {
          // Authentication endpoints
          if (url.endsWith('/api/accounts/authenticate') && method === 'POST') {
            const account = accounts.find(x => x.email === body.email && x.password === body.password && x.isVerified);
            if (!account) return error('Email or password is incorrect');
            return ok({
              ...account,
              accessToken: 'fake-jwt-token-' + account.id,
              refreshToken: 'fake-refresh-token-' + account.id
            });
          }

          if (url.endsWith('/api/accounts/register') && method === 'POST') {
            if (accounts.find(x => x.email === body.email)) {
              return error('Email "' + body.email + '" is already registered');
            }
            const verifyToken = Math.random().toString(36).substr(2, 9);
            const account = { 
              ...body, 
              id: Math.random().toString(36).substr(2, 9), 
              role: accounts.length === 0 ? Role.Admin : Role.User,
              isVerified: false,
              verifyEmailToken: verifyToken
            };
            verifyEmailTokens[verifyToken] = account.id;
            accounts.push(account);
            localStorage.setItem('accounts', JSON.stringify(accounts));
            return ok();
          }

          if (url.endsWith('/api/accounts/verify-email') && method === 'POST') {
            const accountId = verifyEmailTokens[body.token];
            if (!accountId) return error('Token is invalid');
            const account = accounts.find(x => x.id === accountId);
            if (!account) return error('Account not found');
            account.isVerified = true;
            delete account.verifyEmailToken;
            localStorage.setItem('accounts', JSON.stringify(accounts));
            return ok();
          }

          if (url.endsWith('/api/accounts/forgot-password') && method === 'POST') {
            const account = accounts.find(x => x.email === body.email);
            if (account) {
              const resetToken = Math.random().toString(36).substr(2, 9);
              account.resetToken = resetToken;
              resetPasswordTokens[resetToken] = account.id;
              localStorage.setItem('accounts', JSON.stringify(accounts));
            }
            return ok();
          }

          if (url.endsWith('/api/accounts/validate-reset-token') && method === 'POST') {
            const accountId = resetPasswordTokens[body.token];
            if (!accountId) return error('Token is invalid');
            return ok();
          }

          if (url.endsWith('/api/accounts/reset-password') && method === 'POST') {
            const accountId = resetPasswordTokens[body.token];
            if (!accountId) return error('Token is invalid');
            const account = accounts.find(x => x.id === accountId);
            if (!account) return error('Account not found');
            account.password = body.password;
            delete account.resetToken;
            delete resetPasswordTokens[body.token];
            localStorage.setItem('accounts', JSON.stringify(accounts));
            return ok();
          }

          if (url.endsWith('/api/accounts/refresh-token') && method === 'POST') {
            const account = accounts[0];
            if (!account) return error('No account found');
            return ok({
              ...account,
              accessToken: 'fake-jwt-token-' + account.id,
              refreshToken: 'fake-refresh-token-' + account.id
            });
          }

          if (url.endsWith('/api/accounts/revoke-token') && method === 'POST') {
            return ok();
          }

          // Account endpoints
          if (url.match(/\/api\/accounts\/[^/]+$/) && method === 'DELETE') {
            const id = url.split('/').pop();
            accounts = accounts.filter(x => x.id !== id);
            localStorage.setItem('accounts', JSON.stringify(accounts));
            return ok();
          }

          if (url.match(/\/api\/accounts\/[^/]+$/) && method === 'PUT') {
            const id = url.split('/').pop();
            const account = accounts.find(x => x.id === id);
            if (!account) return error('Account not found');
            Object.assign(account, body);
            localStorage.setItem('accounts', JSON.stringify(accounts));
            return ok(account);
          }

          if (url.match(/\/api\/accounts\/[^/]+$/) && method === 'GET') {
            const id = url.split('/').pop();
            const account = accounts.find(x => x.id === id);
            if (!account) return error('Account not found');
            const { password, ...accountWithoutPassword } = account;
            return ok(accountWithoutPassword);
          }

          if (url.endsWith('/api/accounts') && method === 'GET') {
            return ok(accounts.map(({ password, verifyEmailToken, resetToken, ...rest }: any) => rest));
          }

          if (url.endsWith('/api/accounts') && method === 'POST') {
            const newAccount = { 
              ...body, 
              id: Math.random().toString(36).substr(2, 9),
              isVerified: true
            };
            accounts.push(newAccount);
            localStorage.setItem('accounts', JSON.stringify(accounts));
            const { password, ...accountWithoutPassword } = newAccount;
            return ok(accountWithoutPassword);
          }

          return next.handle(request);
        }
      ),
      materialize(),
      delay(500),
      dematerialize()
    );

    function ok(body?: any) {
      return of(new HttpResponse({ status: 200, body }));
    }

    function error(message: string) {
      return throwError(() => ({ error: { message } }));
    }
  }
}

export let fakeBackendProvider = {
    provide: HTTP_INTERCEPTORS,
    useClass: FakeBackendInterceptor,
    multi: true
};
