import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AccountService } from './_services';
import { Account, Role } from './_models';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false
})
export class AppComponent implements OnInit {
  Role = Role;
  account?: Account | null;

  constructor(private accountService: AccountService, private http: HttpClient, private router: Router) {
    this.accountService.account$.subscribe(x => this.account = x);
  }

  ngOnInit() {
    // Keep the backend warm so it doesn't cold-start on first real request
    const ping = () => this.http.get(`${environment.apiUrl}/accounts/ping`, { responseType: 'text' }).subscribe({ error: () => {} });
    ping();
    setInterval(ping, 10 * 60 * 1000); // every 10 minutes
  }

  logout() {
    this.accountService.logout();
    this.router.navigate(['/account/login']);
  }
}
