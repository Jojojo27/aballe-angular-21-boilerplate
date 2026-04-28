import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { first } from 'rxjs/operators';
import { AccountService, AlertService } from '@app/_services';

@Component({
  selector: 'app-update',
  templateUrl: './update.component.html',
  styleUrls: ['./update.component.less'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class UpdateComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  submitted = false;

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
      email: [account?.email, [Validators.required, Validators.email]]
    });
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
    this.accountService.update(this.accountService.accountValue?.id || '', this.form.value)
      .pipe(first())
      .subscribe({
        next: () => {
          this.alertService.success('Profile updated successfully', { keepAfterRouteChange: true });
          this.router.navigate(['/profile']);
        },
        error: (error: any) => {
          this.alertService.error(error);
          this.loading = false;
        }
      });
  }
}
