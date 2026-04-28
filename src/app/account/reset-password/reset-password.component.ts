import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { first } from 'rxjs/operators';
import { AccountService, AlertService } from '@app/_services';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const passwordConfirm = control.get('passwordConfirm');

  if (!password || !passwordConfirm) {
    return null;
  }

  return password.value === passwordConfirm.value ? null : { mustMatch: true };
}

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.less'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class ResetPasswordComponent implements OnInit {
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
    this.form = this.formBuilder.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      passwordConfirm: ['', Validators.required]
    }, { validators: passwordMatchValidator });

    this.token = this.route.snapshot.queryParams['token'];

    if (!this.token) {
      this.alertService.error('Token is missing');
      this.router.navigate(['/']);
    }

    if (this.token) {
      this.accountService.validateResetToken(this.token)
        .pipe(first())
        .subscribe({
          error: () => {
            this.alertService.error('Token has expired or is invalid');
            this.router.navigate(['/']);
          }
        });
    }
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
    this.accountService.resetPassword(this.token || '', this.f['password'].value, this.f['passwordConfirm'].value)
      .pipe(first())
      .subscribe({
        next: () => {
          this.alertService.success('Password reset successful, you can now login', { keepAfterRouteChange: true });
          this.router.navigate(['/account/login']);
        },
        error: (error: any) => {
          this.alertService.error(error);
          this.loading = false;
        }
      });
  }
}
