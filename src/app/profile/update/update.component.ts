import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { MustMatch } from '@app/_helpers';
import { AccountService, AlertService } from '@app/_services';

@Component({ templateUrl: 'update.component.html', standalone: false })
export class UpdateComponent implements OnInit {
  form!: FormGroup;
  submitting = false;
  submitted = false;
  deleting = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private accountService: AccountService,
    private alertService: AlertService
  ) { }

  ngOnInit() {
    const account = this.accountService.accountValue;
    this.form = this.formBuilder.group({
      title: [account?.title, Validators.required],
      firstName: [account?.firstName, Validators.required],
      lastName: [account?.lastName, Validators.required],
      email: [account?.email, [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
      confirmPassword: ['']
    }, { validator: MustMatch('password', 'confirmPassword') });
  }

  get f() {
    return this.form.controls;
  }

  onSubmit() {
    this.submitted = true;
    if (this.form.invalid) return;
    this.submitting = true;
    this.accountService.update(this.accountService.accountValue?.id || '', this.form.value)
      .pipe(first())
      .subscribe({
        next: () => {
          this.alertService.success('Profile updated successfully', { keepAfterRouteChange: true });
          this.router.navigate(['/profile']);
        },
        error: (error: any) => {
          this.alertService.error(error);
          this.submitting = false;
        }
      });
  }

  onDelete() {
    if (!confirm('Are you sure you want to delete your account?')) return;
    this.deleting = true;
    this.accountService.delete(this.accountService.accountValue?.id || '')
      .pipe(first())
      .subscribe({
        next: () => {
          this.alertService.success('Account deleted successfully');
        },
        error: (error: any) => {
          this.alertService.error(error);
          this.deleting = false;
        }
      });
  }
}
