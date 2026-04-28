import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { first } from 'rxjs/operators';
import { AccountService, AlertService } from '@app/_services';

@Component({
  selector: 'app-add-edit',
  templateUrl: './add-edit.component.html',
  styleUrls: ['./add-edit.component.less'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class AddEditComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  submitted = false;
  isAddMode?: boolean;
  id?: string;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private accountService: AccountService,
    private alertService: AlertService
  ) { }

  ngOnInit() {
    this.id = this.route.snapshot.params['id'];
    this.isAddMode = !this.id;

    const passwordValidators = [Validators.minLength(6)];
    if (this.isAddMode) {
      passwordValidators.push(Validators.required);
    }

    this.form = this.formBuilder.group({
      title: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', passwordValidators],
      role: ['', Validators.required]
    });

    if (!this.isAddMode) {
      this.accountService.getById(this.id || '')
        .pipe(first())
        .subscribe({
          next: (account: any) => {
            this.form.patchValue(account);
          },
          error: (error: any) => {
            this.alertService.error(error);
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
    if (this.isAddMode) {
      this.accountService.create(this.form.value)
        .pipe(first())
        .subscribe({
          next: () => {
            this.alertService.success('Account added successfully', { keepAfterRouteChange: true });
            this.router.navigate(['/admin/accounts']);
          },
          error: (error: any) => {
            this.alertService.error(error);
            this.loading = false;
          }
        });
    } else {
      this.accountService.update(this.id || '', this.form.value)
        .pipe(first())
        .subscribe({
          next: () => {
            this.alertService.success('Account updated successfully', { keepAfterRouteChange: true });
            this.router.navigate(['/admin/accounts']);
          },
          error: (error: any) => {
            this.alertService.error(error);
            this.loading = false;
          }
        });
    }
  }
}
