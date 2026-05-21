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
  verified = false;

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
    const email = this.route.snapshot.queryParams['email'] ?? '';
    this.form = this.formBuilder.group({
      email: [email, [Validators.required, Validators.email]],
      code:  ['',    [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern('^[0-9]{6}$')]]
    });
  }

  get f() { return this.form.controls; }

  onSubmit() {
    this.submitted = true;
    this.alertService.clear();
    if (this.form.invalid) return;

    this.loading = true;
    this.accountService.verifyEmail(this.f['email'].value, this.f['code'].value)
      .pipe(first())
      .subscribe({
        next: () => {
          this.verified = true;
          this.loading = false;
          setTimeout(() => {
            this.alertService.success('Email verified! You can now log in.', { keepAfterRouteChange: true });
            this.router.navigate(['/account/login']);
          }, 2000);
        },
        error: (error: any) => {
          this.alertService.error(error);
          this.loading = false;
        }
      });
  }
}
