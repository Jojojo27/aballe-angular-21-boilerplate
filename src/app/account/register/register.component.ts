import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { MustMatch } from '@app/_helpers';
import { AccountService, AlertService } from '@app/_services';

@Component({ templateUrl: 'register.component.html', standalone: false })
export class RegisterComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  submitted = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private accountService: AccountService,
    private alertService: AlertService
  ) {
    if (this.accountService.accountValue) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit() {
    this.form = this.formBuilder.group({
      title: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      passwordConfirm: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue]
    }, { validators: MustMatch('password', 'passwordConfirm') });
  }

  get f() {
    return this.form.controls;
  }

  onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.accountService.register(this.form.value)
      .pipe(first())
      .subscribe({
        next: (response: any) => {
          if (response?.verificationCode) {
            // SMTP not configured — show code so user can verify manually
            this.alertService.success(
              `Registration successful! No email configured — your code is: <strong>${response.verificationCode}</strong>. ` +
              `<a href="/account/verify-email?email=${encodeURIComponent(this.form.value.email)}&token=${response.verificationCode}" style="color:inherit;font-weight:bold">Click here to verify</a>`,
              { keepAfterRouteChange: true }
            );
          } else {
            this.alertService.success(
              'Registration successful! Please check your email and click the verification link (or use the 6-digit code) to activate your account.',
              { keepAfterRouteChange: true }
            );
          }
          this.router.navigate(['/account/login']);
        },
        error: (error: any) => {
          this.alertService.error(error);
          this.loading = false;
        }
      });
  }
}
