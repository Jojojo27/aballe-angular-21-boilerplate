import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { AccountService, AlertService } from '@app/_services';

@Component({ templateUrl: 'verify-email.component.html', standalone: false })
export class VerifyEmailComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  submitted = false;
  token?: string | null;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private accountService: AccountService,
    private alertService: AlertService
  ) {
    if (this.accountService.accountValue) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit() {
    this.form = this.formBuilder.group({});
    this.token = this.route.snapshot.queryParams['token'];

    if (this.token) {
      this.accountService.verifyEmail(this.token)
        .pipe(first())
        .subscribe({
          next: () => {
            this.alertService.success('Verification successful, you can now login', { keepAfterRouteChange: true });
            this.router.navigate(['/account/login']);
          },
          error: (error: any) => {
            this.alertService.error(error);
          }
        });
    }
  }

  onSubmit() {
    this.submitted = true;
    this.loading = true;
  }
}
