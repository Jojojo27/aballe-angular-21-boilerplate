import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Account } from '@app/_models';
import { environment } from '@environments/environment';

const baseUrl = `${environment.apiUrl}/accounts`;

@Injectable({ providedIn: 'root' })
export class AccountService {
  private accountSubject: BehaviorSubject<Account | null>;
  public account$: Observable<Account | null>;

  constructor(private http: HttpClient) {
    const accountJson = localStorage.getItem('account');
    this.accountSubject = new BehaviorSubject(accountJson ? JSON.parse(accountJson) : null);
    this.account$ = this.accountSubject.asObservable();
  }

  public get accountValue(): Account | null {
    return this.accountSubject.value;
  }

  register(account: Account) {
    return this.http.post(`${baseUrl}/register`, account);
  }

  verifyEmail(email: string, token: string) {
    return this.http.post(`${baseUrl}/verify-email`, { email, token });
  }

  login(email: string, password: string) {
    return this.http.post<any>(`${baseUrl}/authenticate`, { email, password })
      .pipe(map((response: any) => {
        this.setAccount(response);
        return response;
      }));
  }

  logout() {
    this.http.post(`${baseUrl}/revoke-token`, {}).subscribe();
    this.setAccount(null);
  }

  refreshToken() {
    return this.http.post<any>(`${baseUrl}/refresh-token`, {})
      .pipe(map((response: any) => {
        this.setAccount(response);
        return response;
      }));
  }

  forgotPassword(email: string) {
    return this.http.post(`${baseUrl}/forgot-password`, { email });
  }

  validateResetToken(token: string) {
    return this.http.post(`${baseUrl}/validate-reset-token`, { token });
  }

  resetPassword(token: string, password: string, passwordConfirm: string) {
    return this.http.post(`${baseUrl}/reset-password`, { token, password, passwordConfirm });
  }

  getAll() {
    return this.http.get<Account[]>(baseUrl);
  }

  getById(id: string) {
    return this.http.get<Account>(`${baseUrl}/${id}`);
  }

  create(account: Account) {
    return this.http.post(baseUrl, account);
  }

  update(id: string, account: Account) {
    return this.http.put(`${baseUrl}/${id}`, account);
  }

  delete(id: string) {
    return this.http.delete(`${baseUrl}/${id}`);
  }

  private setAccount(account: Account | null) {
    if (account) {
      localStorage.setItem('account', JSON.stringify(account));
    } else {
      localStorage.removeItem('account');
    }
    this.accountSubject.next(account);
  }
}
