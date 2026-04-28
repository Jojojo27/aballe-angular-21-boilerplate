import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AlertComponent } from './_components';
import { AccountService } from './_services';
import { Account } from './_models';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less'],
  standalone: true,
  imports: [CommonModule, RouterModule, AlertComponent]
})
export class AppComponent {
  title = 'Angular 21 Boilerplate';
  accountValue?: Account | null;

  constructor(private accountService: AccountService) {
    this.accountService.account$.subscribe(x => this.accountValue = x);
  }

  logout() {
    this.accountService.logout();
  }
}
