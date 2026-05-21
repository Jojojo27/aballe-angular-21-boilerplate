import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { first } from 'rxjs/operators';
import { AccountService, AlertService } from '@app/_services';
import { Account } from '@app/_models';

@Component({
  selector: 'app-accounts-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.less'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class ListComponent implements OnInit {
  accounts?: Account[];
  loading = true;

  constructor(
    public accountService: AccountService,
    private alertService: AlertService
  ) { }

  ngOnInit() {
    this.accountService.getAll()
      .pipe(first())
      .subscribe({
        next: (accounts: any) => {
          this.accounts = accounts;
          this.loading = false;
        },
        error: (error: any) => {
          this.alertService.error(error);
          this.loading = false;
        }
      });
  }

  deleteAccount(id?: string) {
    if (!id) return;
    const account = this.accounts?.find(x => x.id === id);
    if (confirm('Are you sure you want to delete "' + account?.firstName + ' ' + account?.lastName + '"?')) {
      this.accountService.delete(id)
        .pipe(first())
        .subscribe({
          next: () => {
            this.accounts = this.accounts?.filter(x => x.id !== id);
            this.alertService.success('Account deleted successfully');
          },
          error: (error: any) => {
            this.alertService.error(error);
          }
        });
    }
  }
}
