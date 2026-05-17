import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { AccountService } from '@app/_services';

@Component({
  selector: 'app-account-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.less'],
  standalone: true,
  imports: [RouterModule]
})
export class AccountLayoutComponent {
  constructor(
    private router: Router,
    private accountService: AccountService
  ) {
    // redirect to home if already logged in
    if (this.accountService.accountValue) {
      this.router.navigate(['/']);
    }
  }
}
