import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AlertComponent } from './_components';
import { AccountService } from './_services';
import { Account, Role } from './_models';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less'],
  standalone: true,
  imports: [CommonModule, RouterModule, AlertComponent]
})
export class AppComponent {
  Role = Role;
  account?: Account | null;

  constructor(private accountService: AccountService) {
    this.accountService.account$.subscribe(x => this.account = x);
  }

  logout() {
    this.accountService.logout();
  }
}
