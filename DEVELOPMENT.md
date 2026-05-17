# Development

## Install dependencies
npm install

## Start development server
npm start

The app will be available at http://localhost:4200

## Build for production
npm run build

## Testing

The boilerplate includes a fake backend for testing without needing a real API.

### Default test account
- Email: test@example.com
- Password: test

### Creating accounts
1. Register a new account
2. You'll see a verification email on screen (since we're using a fake backend)
3. Click the verification link to verify your account
4. You can now login with your account

## Features

### Authentication
- Email & password registration
- Email verification
- Login with JWT tokens
- Automatic token refresh
- Logout

### Authorization
- Role-based access control
- Admin and User roles
- Protected routes

### Account Management
- View profile
- Update profile
- Admin panel to manage all accounts

### Password Recovery
- Forgot password
- Reset password via email link

## Project Structure

The application follows Angular best practices with:
- Feature-based module structure
- Lazy-loaded routes
- Shared services and guards
- Barrel files for clean imports
- TypeScript path aliases for cleaner imports

## Customization

To connect to a real backend:

1. Replace the `FakeBackendInterceptor` in `app.config.ts` with your real API calls
2. Update the API endpoints in the service classes
3. Configure CORS on your backend if needed

## Core Helpers Reference

### App Initializer

Path: /src/app/_helpers/app.initializer.ts

The app initializer runs before the app bootstraps and attempts to automatically restore
the user session by calling `accountService.refreshToken()`.

This initializer is registered with the `APP_INITIALIZER` token in `app.config.ts`.
Because the initializer returns a Promise that always resolves (both success and error),
the app startup is never blocked if refresh fails.

```ts
import { AccountService } from '@app/_services';

export function appInitializer(accountService: AccountService) {
	return () => {
		return new Promise(resolve => {
			accountService.refreshToken().subscribe({
				next: () => resolve(true),
				error: () => resolve(true)
			});
		});
	};
}
```

### Auth Guard

Path: /src/app/_helpers/auth.guard.ts

The auth guard is an Angular route guard used to prevent unauthorized users from
accessing protected routes. It implements `CanActivate`, which allows Angular Router
to decide whether a route can be activated through the `canActivate()` method.

The guard checks `accountService.accountValue` to determine whether a user is logged in.
If a user is authenticated, it optionally enforces role-based restrictions from
`route.data.roles`.

If the user is not authenticated, the guard redirects to `/account/login` and includes
the current route in the `returnUrl` query parameter so the app can navigate back after
successful login.

If the user is authenticated but does not have a permitted role, it redirects to `/`.

This guard is attached to protected routes in the router configuration to secure user,
profile, and admin sections.

```ts
import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AccountService } from '@app/_services';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
	constructor(
		private router: Router,
		private accountService: AccountService
	) { }

	canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
		const account = this.accountService.accountValue;
		if (account) {
			if (route.data['roles'] && !route.data['roles'].includes(account.role)) {
				this.router.navigate(['/']);
				return false;
			}
			return true;
		}

		this.router.navigate(['/account/login'], { queryParams: { returnUrl: state.url } });
		return false;
	}
}
```

### JWT Interceptor

Path: /src/app/_helpers/jwt.interceptor.ts

The JWT interceptor adds the `Authorization: Bearer <token>` header to API requests.

It only attaches the token when both conditions are true:
- The user has an access token.
- The request URL starts with `/api`.

This prevents sending auth headers to non-API requests.

```ts
if (isLoggedIn && isApiUrl) {
	request = request.clone({
		setHeaders: {
			Authorization: `Bearer ${account.accessToken}`
		}
	});
}
```

### Error Interceptor

Path: /src/app/_helpers/error.interceptor.ts

The Error Interceptor intercepts HTTP responses from API requests and handles failures in
one centralized place.

It is implemented using Angular's `HttpInterceptor` interface. Registering it in the
provider pipeline allows all outgoing requests and incoming responses to pass through this
single handler.

When a `401 Unauthorized` response is returned, the interceptor calls
`accountService.logout()` to clear local auth state and force a clean login flow.

After that, it extracts a normalized error message and rethrows it so calling services and
components can display alerts or inline error messages.

In this boilerplate, interceptors are configured in `app.config.ts` using
`HTTP_INTERCEPTORS` providers.

```ts
import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AccountService } from '@app/_services';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
	constructor(private accountService: AccountService) { }

	intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
		return next.handle(request).pipe(catchError((error: HttpErrorResponse) => {
			if (error.status === 401) {
				this.accountService.logout();
			}

			const errorMessage = error.error?.message || error.statusText || 'An error occurred';
			return throwError(() => errorMessage);
		}));
	}
}
```

### Fake Backend API

Path: /src/app/_helpers/fake-backend.ts

The Fake Backend Interceptor lets you run and test the app without a real server by
intercepting API calls and returning mock responses.

It uses Angular's `HttpInterceptor` interface and routes requests based on `url` and
`method`. Matching routes are handled in-memory, while unknown routes are passed through
to `next.handle(request)`.

Accounts are stored in `localStorage` under the `accounts` key, and verification/reset
tokens are tracked in memory with `verifyEmailTokens` and `resetPasswordTokens` maps.

Supported endpoint groups include:
- Authentication (`/authenticate`, `/refresh-token`, `/revoke-token`)
- Registration and email verification (`/register`, `/verify-email`)
- Password recovery (`/forgot-password`, `/validate-reset-token`, `/reset-password`)
- Account management (`GET/POST /api/accounts`, `GET/PUT/DELETE /api/accounts/:id`)

All fake responses are wrapped with `materialize() -> delay(500) -> dematerialize()`
to simulate network latency for a more realistic UI flow.

```ts
import { Injectable } from '@angular/core';
import { HttpRequest, HttpResponse, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, mergeMap, materialize, dematerialize } from 'rxjs/operators';
import { Role } from '@app/_models';

const verifyEmailTokens: { [key: string]: string } = {};
const resetPasswordTokens: { [key: string]: string } = {};

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
	intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
		const { url, method, body } = request;
		let accounts: any[] = JSON.parse(localStorage.getItem('accounts') || '[]');

		return of(null).pipe(
			mergeMap(() => {
				if (url.endsWith('/api/accounts/register') && method === 'POST') {
					if (accounts.find(x => x.email === body.email)) {
						return error('Email "' + body.email + '" is already registered');
					}

					const verifyToken = Math.random().toString(36).substr(2, 9);
					const account = {
						...body,
						id: Math.random().toString(36).substr(2, 9),
						role: accounts.length === 0 ? Role.Admin : Role.User,
						isVerified: false,
						verifyEmailToken: verifyToken
					};

					verifyEmailTokens[verifyToken] = account.id;
					accounts.push(account);
					localStorage.setItem('accounts', JSON.stringify(accounts));
					return ok();
				}

				if (url.endsWith('/api/accounts') && method === 'GET') {
					return ok(accounts.map(({ password, verifyEmailToken, resetToken, ...rest }: any) => rest));
				}

				return next.handle(request);
			}),
			materialize(),
			delay(500),
			dematerialize()
		);

		function ok(body?: any) {
			return of(new HttpResponse({ status: 200, body }));
		}

		function error(message: string) {
			return throwError(() => ({ error: { message } }));
		}
	}
}
```

### Must Match Validator

Path: /src/app/_helpers/must-match.validator.ts

The Must Match validator is a custom Angular form validator used to validate that two
fields in a form group contain matching values, commonly used for password confirmation.

It is implemented as a higher-order function that returns a validator function accepting
a `FormGroup` or `AbstractControl`. The validator compares two controls by name and
sets or clears a `mustMatch` error on the matching control based on whether values match.

The validator checks if controls exist and respects errors from other validators to avoid
overwriting error states. If the values do not match, it sets `{ mustMatch: true }` on
the matching control; if they match, it clears the error (keeping any other errors intact).

This validator is typically added to a form group in the component via the second
argument to `FormGroup()` or `this.formGroup.setValidators()`.

```ts
import { AbstractControl } from '@angular/forms';

// custom validator to check that two fields match
export function MustMatch(controlName: string, matchingControlName: string) {
	return (group: AbstractControl) => {
		const control = group.get(controlName);
		const matchingControl = group.get(matchingControlName);

		if (!control || !matchingControl) {
			return null;
		}

		// return if another validator has already found an error on the matchingControl
		if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
			return null;
		}

		// set error on matchingControl if validation fails
		if (control.value !== matchingControl.value) {
			matchingControl.setErrors({ mustMatch: true });
		} else {
			matchingControl.setErrors(null);
		}

		return null;
	};
}
```

## Core Models Reference

### Account Model

Path: /src/app/_models/account.ts

The Account model is a small class that defines the properties of an account object used
throughout the application.

It includes user profile information (id, email, name fields, title), authentication
state (isVerified, accessToken, refreshToken), authorization (role), and account
lifecycle dates (created, updated).

The model also includes password and passwordConfirm fields for registration and password
reset flows, and acceptTerms for Terms of Service acceptance during signup.

Most properties are optional (marked with `?`) since accounts may not have all information
populated at once.

```ts
import { Role } from './role';

export class Account {
  id?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: Role;
  isVerified?: boolean;
  created?: Date;
  updated?: Date;
  password?: string;
  passwordConfirm?: string;
  acceptTerms?: boolean;
  accessToken?: string;
  refreshToken?: string;
}
```

### Alert Models

Path: /src/app/_models/alert.ts

The alert model file contains the `Alert`, `AlertType` and `AlertOptions` models.

- `Alert` defines the properties of each alert object.
- `AlertType` is an enumeration containing the types of alerts.
- `AlertOptions` defines the options available when sending an alert to the alert service.

```ts
export class Alert {
  id?: string;
  type?: AlertType | string;
  message?: string;
  autoClose?: boolean;
  keepAfterRouteChange?: boolean;
  fade?: boolean;

  constructor(init?: Partial<Alert>) {
    Object.assign(this, init);
  }
}

export enum AlertType {
  Success = 'success',
  Error = 'error',
  Info = 'info',
  Warning = 'warning'
}

export class AlertOptions {
  id?: string;
  autoClose?: boolean;
  keepAfterRouteChange?: boolean;
}
```

### Role Enum

Path: /src/app/_models/role.ts

The role enum defines the roles that are supported by the application.

Two roles are supported: `User` for regular authenticated users, and `Admin` for
administrators who have full access to the admin dashboard and account management.

The first account registered in the application is automatically assigned the `Admin`
role. Subsequent accounts are assigned the `User` role by the fake backend.

```ts
export enum Role {
  User = 'User',
  Admin = 'Admin'
}
```

## Core Services Reference

### Account Service

Path: /src/app/_services/account.service.ts

The account service handles communication between the Angular auth boilerplate and the
backend API for everything related to accounts. It contains methods for the sign up,
verification, authentication, refresh token, forgot password and reset password, as well
as standard CRUD methods for retrieving and modifying account data.

This implementation persists the authenticated account object in `localStorage` and
restores it on app startup. The current account state is exposed through `account$`
(`Observable<Account | null>`) and `accountValue` for synchronous access.

On `login()` and `refreshToken()`, the API response is passed to a private `setAccount()`
helper that updates both localStorage and the `BehaviorSubject` so all subscribers are
notified.

On `logout()`, a revoke-token request is sent, then local auth state is cleared by calling
`setAccount(null)`.

```ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Account } from '@app/_models';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private accountSubject: BehaviorSubject<Account | null>;
  public account$: Observable<Account | null>;

  constructor(private http: HttpClient) {
    const accountJson = localStorage.getItem('account');
    this.accountSubject = new BehaviorSubject(accountJson ? JSON.parse(accountJson) : null);
    this.account$ = this.accountSubject.asObservable();
  }

  public get accountValue(): Account | null {
    return this.accountSubject.value;
  }

  register(account: Account) {
    return this.http.post('/api/accounts/register', account);
  }

  verifyEmail(token: string) {
    return this.http.post('/api/accounts/verify-email', { token });
  }

  login(email: string, password: string) {
    return this.http.post<any>('/api/accounts/authenticate', { email, password })
      .pipe(map((response: any) => {
        this.setAccount(response);
        return response;
      }));
  }

  logout() {
    this.http.post('/api/accounts/revoke-token', {}).subscribe();
    this.setAccount(null);
  }

  refreshToken() {
    return this.http.post<any>('/api/accounts/refresh-token', {})
      .pipe(map((response: any) => {
        this.setAccount(response);
        return response;
      }));
  }

  forgotPassword(email: string) {
    return this.http.post('/api/accounts/forgot-password', { email });
  }

  validateResetToken(token: string) {
    return this.http.post('/api/accounts/validate-reset-token', { token });
  }

  resetPassword(token: string, password: string, passwordConfirm: string) {
    return this.http.post('/api/accounts/reset-password', { token, password, passwordConfirm });
  }

  getAll() {
    return this.http.get<Account[]>('/api/accounts');
  }

  getById(id: string) {
    return this.http.get<Account>(`/api/accounts/${id}`);
  }

  create(account: Account) {
    return this.http.post('/api/accounts', account);
  }

  update(id: string, account: Account) {
    return this.http.put(`/api/accounts/${id}`, account);
  }

  delete(id: string) {
    return this.http.delete(`/api/accounts/${id}`);
  }

  private setAccount(account: Account | null) {
    if (account) {
      localStorage.setItem('account', JSON.stringify(account));
    } else {
      localStorage.removeItem('account');
    }
    this.accountSubject.next(account);
  }
}
```

### Alert Service

Path: /src/app/_services/alert.service.ts

The alert service acts as the bridge between any Angular component and the alert
component that renders the alert messages. It contains methods for sending, clearing
and subscribing to alert messages.

You can trigger alert notifications from any component or service by calling one of the
convenience methods for displaying the different types of alerts: `success()`, `error()`,
`info()` and `warn()`.

Alert method parameters

- The first parameter is a `string` for the alert message which can be a plain text or HTML.
- The second parameter is an optional `AlertOptions` object that supports the following properties (all are optional):
  - `id` - the id of the `<alert>` component that will display the alert notification. The default value is `"default-alert"`.
  - `autoClose` - if `true` the alert will automatically close after three seconds. The default value is `true`.
  - `keepAfterRouteChange` - if `true` the alert will continue to display after one route change, which is useful to display an alert after an automatic redirect (e.g. after completing a form). The default value is `false`.

The alert service uses the RxJS Observable and Subject classes to enable
communication with other components.

```ts
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

import { Alert, AlertOptions, AlertType } from '@app/_models';

@Injectable({ providedIn: 'root' })
export class AlertService {
	private subject = new Subject<Alert>();
	private defaultId = 'default-alert';

	// enable subscribing to alerts observable
	onAlert(id = this.defaultId): Observable<Alert> {
		return this.subject.asObservable().pipe(filter(x => x.id === id));
	}

	// convenience methods
	success(message: string, options?: AlertOptions) {
		this.alert(new Alert({ ...options, type: AlertType.Success, message }));
	}

	error(message: string, options?: AlertOptions) {
		this.alert(new Alert({ ...options, type: AlertType.Error, message }));
	}

	info(message: string, options?: AlertOptions) {
		this.alert(new Alert({ ...options, type: AlertType.Info, message }));
	}

	warn(message: string, options?: AlertOptions) {
		this.alert(new Alert({ ...options, type: AlertType.Warning, message }));
	}

	// core alert method
	alert(alert: Alert) {
		alert.id = alert.id || this.defaultId;
		alert.autoClose = alert.autoClose === undefined ? true : alert.autoClose;
		this.subject.next(alert);
	}

	// clear alerts
	clear(id = this.defaultId) {
		this.subject.next(new Alert({ id }));
	}
}
```

## Feature Modules

### Account Feature Module

Path: /src/app/account/account.module.ts

The account module defines the feature module for the account section along with
metadata about the module. The `imports` specify which other angular modules are
required by this module, and the `declarations` specify which components belong to
this module. For more info on angular feature modules see
https://angular.io/guide/feature-modules.

The account module is hooked into the main app inside the app routing module with
lazy loading.

```ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { AccountRoutingModule } from './account-routing.module';
import { AccountLayoutComponent } from './layout/layout.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { VerifyEmailComponent } from './verify-email/verify-email.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AccountRoutingModule,
    AccountLayoutComponent,
    LoginComponent,
    RegisterComponent,
    VerifyEmailComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent
  ]
})
export class AccountModule { }
```

### Admin Feature Module

Path: /src/app/admin/admin.module.ts

The admin module defines the feature module for the admin section along with
metadata about the module. The `imports` specify which other angular modules are
required by this module, and the `declarations` specify which components belong to
this module. For more info on angular feature modules see
https://angular.io/guide/feature-modules.

The admin module is hooked into the main app inside the app routing module with
lazy loading.

```ts
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { SubNavComponent } from './subnav.component';
import { LayoutComponent } from './layout.component';
import { OverviewComponent } from './overview.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AdminRoutingModule
  ],
  declarations: [
    SubNavComponent,
    LayoutComponent,
    OverviewComponent
  ]
})
export class AdminModule { }
```

### Admin » Accounts Feature Module

Path: /src/app/admin/accounts/accounts.module.ts

The accounts module defines the feature module for the accounts section along with
metadata about the module. The `imports` specify which other angular modules are
required by this module, and the `declarations` specify which components belong to
this module. For more info on angular feature modules see
https://angular.io/guide/feature-modules.

The accounts module is hooked into the Angular auth boilerplate as a child of the
admin section via the admin routing module with lazy loading.

```ts
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AccountsRoutingModule } from './accounts-routing.module';
import { ListComponent } from './list.component';
import { AddEditComponent } from './add-edit.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AccountsRoutingModule
  ],
  declarations: [
    ListComponent,
    AddEditComponent
  ]
})
export class AccountsModule { }
```

### Profile Feature Module

Path: /src/app/profile/profile.module.ts

The profile module defines the feature module for the profile section along with
metadata about the module. The `imports` specify which other angular modules are
required by this module, and the `declarations` specify which components belong to
this module.

The profile module is hooked into the main app inside the app routing module with
lazy loading.

```ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { ProfileRoutingModule } from './profile-routing.module';
import { ProfileLayoutComponent } from './layout/layout.component';
import { ProfileDetailsComponent } from './details/details.component';
import { ProfileUpdateComponent } from './update/update.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ProfileRoutingModule,
    ProfileLayoutComponent,
    ProfileDetailsComponent,
    ProfileUpdateComponent
  ]
})
export class ProfileModule { }
```

## Feature Routing Modules

### Account Routing Module

Path: /src/app/account/account-routing.module.ts

The account routing module defines the routes for the account feature module. It
includes routes for login, registration and related functionality, and a parent route for
the account layout component which contains the common layout code for the
account section.

```ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LayoutComponent } from './layout/layout.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { VerifyEmailComponent } from './verify-email/verify-email.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';

const routes: Routes = [
  {
    path: '', 
    component: LayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'verify-email', component: VerifyEmailComponent },
      { path: 'forgot-password', component: ForgotPasswordComponent },
      { path: 'reset-password', component: ResetPasswordComponent }
    ]
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    LayoutComponent,
    LoginComponent,
    RegisterComponent,
    VerifyEmailComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent
  ],
  exports: [RouterModule]
})
export class AccountRoutingModule { }
```

### Admin Routing Module

Path: /src/app/admin/admin-routing.module.ts

The admin routing module defines the routes for the admin feature module. There
are routes for the overview page and accounts section, and a parent route for the
admin layout component which contains the common layout code for the admin
section.

The `SubNavComponent` route renders the admin subnav component in the `'subnav'`
outlet of the app component template for all admin pages. The subnav outlet is
located directly below the main nav in the app component template.

The accounts feature module is lazy loaded as a child module of the admin feature
module.

```ts
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SubNavComponent } from './subnav.component';
import { LayoutComponent } from './layout.component';
import { OverviewComponent } from './overview.component';

const accountsModule = () => import('./accounts/accounts.module').then(x => x.AccountsModule);

const routes: Routes = [
  { path: '', component: SubNavComponent, outlet: 'subnav' },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: OverviewComponent },
      { path: 'accounts', loadChildren: accountsModule }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
```

### Admin » Accounts Routing Module

Path: /src/app/admin/accounts/accounts-routing.module.ts

The accounts routing module defines the routes for the accounts feature module, it
includes routes for listing, adding and editing accounts. The add and edit routes are
separate but both load the same component (`AddEditComponent`) which modifies
behaviour based on the route.

```ts
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ListComponent } from './list.component';
import { AddEditComponent } from './add-edit.component';

const routes: Routes = [
  { path: '', component: ListComponent },
  { path: 'add', component: AddEditComponent },
  { path: 'edit/:id', component: AddEditComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AccountsRoutingModule { }
```

### Profile Routing Module

Path: /src/app/profile/profile-routing.module.ts

The profile routing module defines the routes for the profile feature module. It
includes routes for profile details and update profile, and a parent route for the profile
layout which contains the common layout code for the profile section.

```ts
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LayoutComponent } from './layout.component';
import { DetailsComponent } from './details.component';
import { UpdateComponent } from './update.component';

const routes: Routes = [
  {
    path: '', component: LayoutComponent,
    children: [
      { path: '', component: DetailsComponent },
      { path: 'update', component: UpdateComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProfileRoutingModule { }
```

## Component Templates

### Forgot Password Component Template

Path: /src/app/account/forgot-password.component.html

The forgot password component template contains a simple form with a single field
for entering the email of the account that you have forgotten password for. The form
element uses the `[formGroup]` directive to bind to the `form` FormGroup in the forgot
password component below, and it binds the form submit event to the `onSubmit()`
handler in the forgot password component using the angular event binding
`(ngSubmit)="onSubmit()"`.

```html
<div class="col-md-6 offset-md-3 mt-5">
  <div class="card">
    <div class="card-body">
      <h4 class="card-title">Forgot Password</h4>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <p>Please enter your email address to receive a password reset link</p>
        <div class="mb-3">
          <label class="form-label">Email</label>
          <input type="text" formControlName="email" class="form-control" />
          <div *ngIf="submitted && f['email'].errors" class="text-danger">
            <div *ngIf="f['email'].errors['required']">Email is required</div>
            <div *ngIf="f['email'].errors['email']">Email must be a valid email address</div>
          </div>
        </div>
        <button [disabled]="form.invalid || loading" class="btn btn-primary">
          <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
          Submit
        </button>
      </form>

      <div class="text-center mt-3">
        <p><a routerLink="/account/login">Back to Login</a></p>
      </div>
    </div>
  </div>
</div>
```

### Login Component Template

Path: /src/app/account/login.component.html

The login component template contains a login form with email and password fields.
It displays validation messages for invalid fields when the form is submitted. The form
submit event is bound to the `onSubmit()` method of the login component.

The component uses reactive form validation to validate the input fields.

```html
<h3 class="card-header">Login</h3>
<div class="card-body">
  <form [formGroup]="form" (ngSubmit)="onSubmit()">
    <div class="mb-3">
      <label class="form-label">Email</label>
      <input type="text" formControlName="email" class="form-control" [ngClass]="{ 'is-invalid': submitted && f.email.errors }" />
      <div *ngIf="submitted && f.email.errors" class="invalid-feedback">
        <div *ngIf="f.email.errors.required">Email is required</div>
        <div *ngIf="f.email.errors.email">Email is invalid</div>
      </div>
    </div>
    <div class="mb-3">
      <label class="form-label">Password</label>
      <input type="password" formControlName="password" class="form-control" [ngClass]="{ 'is-invalid': submitted && f.password.errors }" />
      <div *ngIf="submitted && f.password.errors" class="invalid-feedback">
        <div *ngIf="f.password.errors.required">Password is required</div>
      </div>
    </div>
    <div class="row">
      <div class="mb-3 col">
        <button [disabled]="submitting" class="btn btn-primary">
          <span *ngIf="submitting" class="spinner-border spinner-border-sm me-1"></span>
          Login
        </button>
        <a routerLink="../register" class="btn btn-link">Register</a>
      </div>
      <div class="mb-3 col text-end">
        <a routerLink="../forgot-password" class="btn btn-link pe-0">Forgot Password?</a>
      </div>
    </div>
  </form>
</div>
```

### Register Component Template

Path: /src/app/account/register.component.html

The register component template contains an account registration form with fields for
title, first name, last name, email, password, confirm password and an accept Ts & Cs
checkbox. All fields are required including the checkbox, the email field must be a
valid email address, the password field must have a min length of 6 and must match
the confirm password field.

The template displays validation messages for invalid fields when the form is
submitted. The form element uses the `[formGroup]` directive to bind to the `form`
FormGroup in the register component below, and it binds the form submit event to
the `onSubmit()` handler in the register component using the angular event binding
`(ngSubmit)="onSubmit()"`.

The component uses reactive form validation to validate the input fields.

```html
<h3 class="card-header">Register</h3>
<div class="card-body">
  <form [formGroup]="form" (ngSubmit)="onSubmit()">
    <div class="row">
      <div class="mb-3 col-2">
        <label class="form-label">Title</label>
        <select formControlName="title" class="form-select" [ngClass]="{ 'is-invalid': submitted && f.title.errors }">
          <option value=""></option>
          <option value="Mr">Mr</option>
          <option value="Mrs">Mrs</option>
          <option value="Miss">Miss</option>
          <option value="Ms">Ms</option>
        </select>
        <div *ngIf="submitted && f.title.errors" class="invalid-feedback">
          <div *ngIf="f.title.errors.required">Title is required</div>
        </div>
      </div>
      <div class="mb-3 col-5">
        <label class="form-label">First Name</label>
        <input type="text" formControlName="firstName" class="form-control" [ngClass]="{ 'is-invalid': submitted && f.firstName.errors }" />
        <div *ngIf="submitted && f.firstName.errors" class="invalid-feedback">
          <div *ngIf="f.firstName.errors.required">First Name is required</div>
        </div>
      </div>
      <div class="mb-3 col-5">
        <label class="form-label">Last Name</label>
        <input type="text" formControlName="lastName" class="form-control" [ngClass]="{ 'is-invalid': submitted && f.lastName.errors }" />
        <div *ngIf="submitted && f.lastName.errors" class="invalid-feedback">
          <div *ngIf="f.lastName.errors.required">Last Name is required</div>
        </div>
      </div>
    </div>

    <div class="mb-3">
      <label class="form-label">Email</label>
      <input type="text" formControlName="email" class="form-control" [ngClass]="{ 'is-invalid': submitted && f.email.errors }" />
      <div *ngIf="submitted && f.email.errors" class="invalid-feedback">
        <div *ngIf="f.email.errors.required">Email is required</div>
        <div *ngIf="f.email.errors.email">Email must be a valid email address</div>
      </div>
    </div>

    <div class="row">
      <div class="mb-3 col">
        <label class="form-label">Password</label>
        <input type="password" formControlName="password" class="form-control" [ngClass]="{ 'is-invalid': submitted && f.password.errors }" />
        <div *ngIf="submitted && f.password.errors" class="invalid-feedback">
          <div *ngIf="f.password.errors.required">Password is required</div>
          <div *ngIf="f.password.errors.minlength">Password must be at least 6 characters</div>
        </div>
      </div>
      <div class="mb-3 col">
        <label class="form-label">Confirm Password</label>
        <input type="password" formControlName="passwordConfirm" class="form-control" [ngClass]="{ 'is-invalid': submitted && f.confirmPassword.errors }" />
        <div *ngIf="submitted && f.confirmPassword.errors" class="invalid-feedback">
          <div *ngIf="f.confirmPassword.errors.required">Confirm Password is required</div>
          <div *ngIf="f.confirmPassword.errors.mustMatch">Passwords must match</div>
        </div>
      </div>
    </div>

    <div class="mb-3 form-check">
      <input type="checkbox" formControlName="acceptTerms" id="acceptTerms" class="form-check-input" [ngClass]="{ 'is-invalid': submitted && f.acceptTerms.errors }" />
      <label for="acceptTerms" class="form-check-label">Accept Terms & Conditions</label>
      <div *ngIf="submitted && f.acceptTerms.errors" class="invalid-feedback">Accept Ts & Cs is required</div>
    </div>

    <div class="mb-3">
      <button [disabled]="submitting" class="btn btn-primary">
        <span *ngIf="submitting" class="spinner-border spinner-border-sm me-1"></span>
        Register
      </button>
      <a routerLink="../login" href="#" class="btn btn-link">Cancel</a>
    </div>
  </form>
</div>
```

### Reset Password Component Template

Path: /src/app/account/reset-password.component.html

The reset password component template renders one of the following three views
based on the status of the token being validated by the reset password component:

- Token Validating: a message stating that the token is validating.
- Token Invalid: a message that the validation failed and a link to the forgot
password page to get a new token.
- Token Valid: a form to reset the password that contains fields for password and
confirm password.

```html
<h3 class="card-header">Reset Password</h3>
<div class="card-body">
  <div *ngIf="tokenStatus == TokenStatus.Validating">
    Validating token...
  </div>
  <div *ngIf="tokenStatus == TokenStatus.Invalid">
    Token validation failed, if the token has expired you can get a new one at the <a routerLink="../forgot-password">forgot password</a> page.
  </div>
  <form *ngIf="tokenStatus == TokenStatus.Valid" [formGroup]="form" (ngSubmit)="onSubmit()">
    <div class="mb-3">
      <label class="form-label">Password</label>
      <input type="password" formControlName="password" class="form-control" [ngClass]="{ 'is-invalid': submitted && f.password.errors }" />
      <div *ngIf="submitted && f.password.errors" class="invalid-feedback">
        <div *ngIf="f.password.errors.required">Password is required</div>
        <div *ngIf="f.password.errors.minlength">Password must be at least 6 characters</div>
      </div>
    </div>

    <div class="mb-3">
      <label class="form-label">Confirm Password</label>
      <input type="password" formControlName="passwordConfirm" class="form-control" [ngClass]="{ 'is-invalid': submitted && f.confirmPassword.errors }" />
      <div *ngIf="submitted && f.confirmPassword.errors" class="invalid-feedback">
        <div *ngIf="f.confirmPassword.errors.required">Confirm Password is required</div>
        <div *ngIf="f.confirmPassword.errors.mustMatch">Passwords must match</div>
      </div>
    </div>

    <div class="mb-3">
      <button [disabled]="loading" class="btn btn-primary">
        <span *ngIf="loading" class="spinner-border spinner-border-sm me-1"></span>
        Reset Password
      </button>
      <a routerLink="../login" class="btn btn-link">Cancel</a>
    </div>
  </form>
</div>
```

### Verify Email Component Template

Path: /src/app/account/verify-email.component.html

The verify email component template renders one of the following two views based
on the status of the email token being verified by the verify email component:

- Verifying: a message stating that the email is verifying.
- Failed: a message that email verification failed and a link to the forgot password
page as an alternative way to verify the email.

On success the user is redirected to the login page.

```html
<div class="col-md-6 offset-md-3 mt-5">
  <div class="alert alert-info">
    <strong>Angular 21 Boilerplate</strong>
    <p>Email: test@example.com | Password: test</p>
  </div>

  <div class="card">
    <div class="card-body">
      <h4 class="card-title">Verify Email</h4>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="mb-3">
          <p>Verification email sent, check your email for the verification link</p>
        </div>
        <button [disabled]="form.invalid" class="btn btn-primary">
          <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
          Verify Email
        </button>
      </form>
    </div>
  </div>
</div>
```

### Admin » Accounts Add/Edit Component Template

Path: /src/app/admin/accounts/add-edit.component.html

The accounts add/edit component template contains a dynamic form that supports
both adding and editing accounts. The form is in edit mode when there is an account
id property in the current route, otherwise it is in add mode.

In edit mode the form is pre-populated with account details fetched from the API and
the password field is optional. The dynamic behaviour is implemented in the accounts
add/edit component.

```html
<div class="p-4">
  <h1>{{ isAddMode ? 'Add Account' : 'Edit Account' }}</h1>

  <form [formGroup]="form" (ngSubmit)="onSubmit()">
    <div class="mb-3">
      <label class="form-label">Title</label>
      <select formControlName="title" class="form-select">
        <option value=""></option>
        <option value="Mr">Mr</option>
        <option value="Mrs">Mrs</option>
        <option value="Miss">Miss</option>
        <option value="Ms">Ms</option>
      </select>
      <div *ngIf="submitted && f['title'].errors" class="text-danger">Title is required</div>
    </div>
    <div class="mb-3">
      <label class="form-label">First Name</label>
      <input type="text" formControlName="firstName" class="form-control" />
      <div *ngIf="submitted && f['firstName'].errors" class="text-danger">First Name is required</div>
    </div>
    <div class="mb-3">
      <label class="form-label">Last Name</label>
      <input type="text" formControlName="lastName" class="form-control" />
      <div *ngIf="submitted && f['lastName'].errors" class="text-danger">Last Name is required</div>
    </div>
    <div class="mb-3">
      <label class="form-label">Email</label>
      <input type="text" formControlName="email" class="form-control" />
      <div *ngIf="submitted && f['email'].errors" class="text-danger">
        <div *ngIf="f['email'].errors['required']">Email is required</div>
        <div *ngIf="f['email'].errors['email']">Email must be a valid email address</div>
      </div>
    </div>
    <div class="mb-3" *ngIf="isAddMode">
      <label class="form-label">Password</label>
      <input type="password" formControlName="password" class="form-control" />
      <div *ngIf="submitted && f['password'].errors" class="text-danger">
        <div *ngIf="f['password'].errors['required']">Password is required</div>
        <div *ngIf="f['password'].errors['minlength']">Password must be at least 6 characters</div>
      </div>
    </div>
    <div class="mb-3">
      <label class="form-label">Role</label>
      <select formControlName="role" class="form-select">
        <option value=""></option>
        <option value="User">User</option>
        <option value="Admin">Admin</option>
      </select>
      <div *ngIf="submitted && f['role'].errors" class="text-danger">Role is required</div>
    </div>
    <button [disabled]="form.invalid || loading" class="btn btn-primary">
      <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
      {{ isAddMode ? 'Create' : 'Update' }}
    </button>
    <a routerLink="/admin/accounts" class="btn btn-secondary ms-2">Cancel</a>
  </form>
</div>
```

### Admin » Accounts List Component Template

Path: /src/app/admin/accounts/list.component.html

The accounts list component template displays a list of all accounts and contains
buttons for creating, editing and deleting accounts.

```html
<h1>Accounts</h1>
<p>All accounts from secure (admin only) api end point:</p>
<a routerLink="add" class="btn btn-sm btn-success mb-2">Create Account</a>
<table class="table table-striped">
  <thead>
    <tr>
      <th style="width:30%">Name</th>
      <th style="width:30%">Email</th>
      <th style="width:30%">Role</th>
      <th style="width:10%"></th>
    </tr>
  </thead>
  <tbody>
    <tr *ngFor="let account of accounts">
      <td class="align-middle">{{account.title}} {{account.firstName}} {{account.lastName}}</td>
      <td class="align-middle">{{account.email}}</td>
      <td class="align-middle">{{account.role}}</td>
      <td style="white-space: nowrap">
        <a routerLink="edit/{{account.id}}" class="btn btn-sm btn-primary me-1">Edit</a>
        <button (click)="deleteAccount(account.id)" class="btn btn-sm btn-danger btn-delete-account" [disabled]="account.isDeleting">
          <span *ngIf="account.isDeleting" class="spinner-border spinner-border-sm"></span>
          <span *ngIf="!account.isDeleting">Delete</span>
        </button>
      </td>
    </tr>
    <tr *ngIf="loading">
      <td colspan="4" class="text-center">
        <span class="spinner-border spinner-border-lg align-center"></span>
      </td>
    </tr>
    <tr *ngIf="!loading && accounts.length == 0">
      <td colspan="4" class="text-center text-muted">
        No accounts found.
      </td>
    </tr>
  </tbody>
</table>
```

### Admin Layout Component Template

Path: /src/app/admin/layout.component.html

The admin layout component template is the root template of the admin feature /
section of the app, it contains the outer HTML for all `/admin` pages and a
`<router-outlet>` for rendering the currently routed component.

```html
<div class="p-4">
  <div class="container">
    <router-outlet></router-outlet>
  </div>
</div>
```

### Admin Overview Component Template

Path: /src/app/admin/overview.component.html

The admin overview component template displays some basic info about the admin
section and a link to the "accounts" subsection.

```html
<div class="p-4">
  <div class="container">
    <h1>Admin</h1>
    <p>This section can only be accessed by administrators.</p>
    <p><a routerLink="accounts">Manage Accounts</a></p>
  </div>
</div>
```

### Admin Sub Nav Component Template

Path: /src/app/admin/subnav.component.html

The admin sub nav component template contains the navigation for the admin
section of the boilerplate app, it is displayed directly below the main nav on all admin
pages of the application.

The sub nav is rendered in the "subnav" router outlet of the app component template
by the admin routing module.

```html
<nav class="admin-nav navbar navbar-expand navbar-light px-3">
  <div class="navbar-nav">
    <a routerLink="accounts" routerLinkActive="active" class="nav-item nav-link">Accounts</a>
  </div>
</nav>
```

### Home Component Template

Path: /src/app/home/home.component.html

The home component template displays a simple welcome message with the first
name of the logged in account.

```html
<div class="p-4">
  <div class="container">
    <h1>Hi {{account?.firstName}}!</h1>
    <p>You're logged in with Angular 15 & JWT!!</p>
  </div>
</div>
```

### Profile Details Component Template

Path: /src/app/profile/details.component.html

The profile details component template displays the name and email of the
authenticated account with a link to the update profile page.

```html
<h1>My Profile</h1>
<p *ngIf="account">
  <strong>Name: </strong> {{account.title}} {{account.firstName}} {{account.lastName}}<br />
  <strong>Email: </strong> {{account.email}}
</p>
<p><a routerLink="update">Update Profile</a></p>
```

### Profile Layout Component Template

Path: /src/app/profile/layout.component.html

The profile layout component template is the root template of the profile feature /
section of the boilerplate app, it contains the outer HTML for all `/profile` pages and a
`<router-outlet>` to render the currently routed component.

```html
<div class="p-4">
  <div class="container">
    <router-outlet></router-outlet>
  </div>
</div>
```

## Component Classes

### Forgot Password Component

Path: /src/app/account/forgot-password.component.ts

On valid submit the forgot password component calls `this.accountService.forgotPassword()` and displays either a success or error
message. If the email matches a registered account the backend API displays a
password reset "email" on the screen with instructions (a real backend api would send
an actual email for this step), the instructions include a link to reset the password of
the account.

```ts
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { first } from 'rxjs/operators';

import { AccountService, AlertService } from '@app/_services';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.less'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class ForgotPasswordComponent implements OnInit {
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
      email: ['', [Validators.required, Validators.email]]
    });
  }

  // convenience getter for easy access to form fields
  get f() { return this.form.controls; }

  onSubmit() {
    this.submitted = true;

    // reset alerts on submit
    this.alertService.clear();

    // stop here if form is invalid
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.accountService.forgotPassword(this.f['email'].value)
      .pipe(first())
      .subscribe({
        next: () => {
          this.alertService.success('Please check your email for password reset instructions');
          this.router.navigate(['/account/login']);
        },
        error: (error: any) => {
          this.alertService.error(error);
          this.loading = false;
        }
      });
  }
}
```

### Login Component

Path: /src/app/account/login.component.ts

The login component uses the account service to login to the application on form
submit. It creates the form fields and validators using an Angular `FormBuilder` to
create an instance of a `FormGroup` that is stored in the `form` property. The form is then
bound to the `<form>` element in the login component template above using the
`[formGroup]` directive.

On successful login the user is redirected to the page they were trying to access
(`returnUrl`) or the home page (`'/'`) by default. The `returnUrl` query parameter is
added to the url when redirected by the auth guard. On failed login the error returned
from the backend is displayed in the UI.

The component contains a convenience getter property `f` to make it a bit easier to
access form controls, for example you can access the password field in the template
using `f.password` instead of `form.controls.password`.

```ts
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { first } from 'rxjs/operators';

import { AccountService, AlertService } from '@app/_services';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.less'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class LoginComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  submitted = false;
  returnUrl?: string;

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
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'];
  }

  // convenience getter for easy access to form fields
  get f() {
    return this.form.controls;
  }

  onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.accountService.login(this.f['email'].value, this.f['password'].value)
      .pipe(first())
      .subscribe({
        next: () => {
          this.alertService.success('Login successful', { keepAfterRouteChange: true });
          this.router.navigate([this.returnUrl || '/']);
        },
        error: (error: any) => {
          this.alertService.error(error);
          this.loading = false;
        }
      });
  }
}
```

### Register Component

Path: /src/app/account/register.component.ts

The register component creates a new account with the account service when the
register form is valid and submitted.

It creates the form fields and validators using an Angular `FormBuilder` to create an
instance of a `FormGroup` that is stored in the `form` property. The form is then bound to
the `<form>` element in the register component template using the `[formGroup]`
directive.

The component contains a convenience getter property `f` to make it a bit easier to
access form controls, for example you can access the password field in the template
using `f.password` instead of `form.controls.password`.

On successful registration a success message is displayed and the user is redirected to
the login page, then the fake backend API displays a verification "email" on the screen
with instructions (a real backend api would send an actual email for this step), the
instructions include a link to verify the account.

```ts
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
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
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.less'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
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
    }, { validators: passwordMatchValidator });
  }

  // convenience getter for easy access to form fields
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
        next: () => {
          this.alertService.success('Registration successful, please check your email for verification instructions', { keepAfterRouteChange: true });
          this.router.navigate(['/account/login']);
        },
        error: (error: any) => {
          this.alertService.error(error);
          this.loading = false;
        }
      });
  }
}
```

### Reset Password Component

Path: /src/app/account/reset-password.component.ts

The reset password component displays a form for resetting an account password
when it receives a valid password reset token in the url querystring parameters. The
token is validated when the component initializes by calling
`this.accountService.validateResetToken(token)` from the `ngOnInit()` Angular
lifecycle method.

On form submit the password is reset by calling
`this.accountService.resetPassword(...)` which sends the token and new password
to the backend. The backend should validate the token again before updating the
password.

On successful password reset the user is redirected to the login page with a success
message and can login to the boilerplate app with the new password.

```ts
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

  // convenience getter for easy access to form fields
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
```

### Verify Email Component

Path: /src/app/account/verify-email.component.ts

The verify email component is used to verify new accounts before they can login to
the boilerplate app. When a new account is registered an email is sent to the user
containing a link to this component with a verification token in the querystring
parameters. The token from the email link is verified when the component initializes
by calling `this.accountService.verifyEmail(token)` from the `ngOnInit()` Angular
lifecycle method.

On successful verification the user is redirected to the login page with a success
message and they can login to the account, if token verification fails an error message
is displayed.

NOTE: When using the app with the fake backend API the verification "email" is
displayed on the screen instructions, a real backend API sends a real email to the user.

```ts
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { first } from 'rxjs/operators';

import { AccountService, AlertService } from '@app/_services';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.less'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
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
```

### Admin » Accounts Add/Edit Component

Path: /src/app/admin/accounts/add-edit.component.ts

The accounts add/edit component is used for both adding and editing accounts in
the angular tutorial app, the component is in edit mode when there is an account `id`
route parameter, otherwise it is in add mode.

In add mode the password field is required and the form fields are empty by default.
In edit mode the password field is optional and the form is pre-populated with the
specified account details, which are fetched from the API with the account service.

On submit an account is either created or updated by calling the account service, and
on success you are redirected back to the accounts list page with a success message.

```ts
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize, first } from 'rxjs/operators';

import { AccountService, AlertService } from '@app/_services';
import { MustMatch } from '@app/_helpers';

@Component({ templateUrl: 'add-edit.component.html', standalone: false })
export class AddEditComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  id?: string;
  title!: string;
  loading = false;
  submitting = false;
  submitted = false;

  private loadTimeoutId?: number;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private accountService: AccountService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.id = this.route.snapshot.params['id'];

    this.form = this.formBuilder.group({
      title: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      // password only required in add mode
      password: ['', [Validators.minLength(6), ...(this.id ? [] : [Validators.required])]],
      confirmPassword: ['']
    }, {
      validator: MustMatch('password', 'confirmPassword')
    });

    this.title = 'Create Account';
    if (this.id) {
      this.title = 'Edit Account';
      this.loading = true;
      this.cdr.detectChanges();

      this.loadTimeoutId = window.setTimeout(() => {
        if (this.loading) {
          this.loading = false;
          this.alertService.error('Request timed out');
          this.cdr.detectChanges();
        }
      }, 10000);

      this.accountService.getById(this.id)
        .pipe(
          first(),
          finalize(() => {
            this.loading = false;
            if (this.loadTimeoutId) {
              window.clearTimeout(this.loadTimeoutId);
              this.loadTimeoutId = undefined;
            }
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: x => {
            this.form.patchValue(x);
            this.cdr.detectChanges();
          },
          error: error => {
            this.alertService.error(error);
            this.cdr.detectChanges();
          }
        });
    }
  }

  ngOnDestroy() {
    if (this.loadTimeoutId) {
      window.clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = undefined;
    }
  }

  // convenience getter for easy access to form fields
  get f() { return this.form.controls; }

  onSubmit() {
    this.submitted = true;
    this.cdr.detectChanges();

    this.alertService.clear();

    if (this.form.invalid) {
      return;
    }

    this.submitting = true;
    this.cdr.detectChanges();

    // create or update account based on id param
    let saveAccount;
    let message: string;
    if (this.id) {
      saveAccount = () => this.accountService.update(this.id!, this.form.value);
      message = 'Account updated';
    } else {
      saveAccount = () => this.accountService.create(this.form.value);
      message = 'Account created';
    }

    saveAccount()
      .pipe(first())
      .subscribe({
        next: () => {
          this.alertService.success(message, { keepAfterRouteChange: true });
          this.router.navigateByUrl('/admin/accounts');
        },
        error: error => {
          this.alertService.error(error);
          this.submitting = false;
          this.cdr.detectChanges();
        }
      });
  }
}
```

### Admin » Accounts List Component

Path: /src/app/admin/accounts/list.component.ts

The accounts list component gets all accounts from the account service in the
`ngOnInit()` method and makes them available to the accounts list template via the
`accounts` property.

The `deleteAccount()` method sets the property `account.isDeleting = true` so the
template displays a spinner on the delete button, then calls
`this.accountService.delete(id)` to delete the account from the API and removes the
deleted account from component `accounts` array so it is removed from the UI.

```ts
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { finalize, first } from 'rxjs/operators';

import { AccountService, AlertService } from '@app/_services';

@Component({ templateUrl: 'list.component.html', standalone: false })
export class ListComponent implements OnInit, OnDestroy {
  accounts: any[] = [];
  loading = false;

  private loadTimeoutId?: number;

  constructor(
    private accountService: AccountService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loading = true;
    this.cdr.detectChanges();

    this.loadTimeoutId = window.setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.accounts = [];
        this.alertService.error('Request timed out');
        this.cdr.detectChanges();
      }
    }, 10000);

    this.accountService.getAll()
      .pipe(
        first(),
        finalize(() => {
          this.loading = false;
          if (this.loadTimeoutId) {
            window.clearTimeout(this.loadTimeoutId);
            this.loadTimeoutId = undefined;
          }
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: accounts => {
          this.accounts = accounts;
          this.cdr.detectChanges();
        },
        error: error => {
          this.alertService.error(error);
          this.accounts = [];
          this.cdr.detectChanges();
        }
      });
  }

  ngOnDestroy() {
    if (this.loadTimeoutId) {
      window.clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = undefined;
    }
  }

  deleteAccount(id: string) {
    const account = this.accounts.find(x => x.id === id);
    if (!account) return;

    account.isDeleting = true;
    this.cdr.detectChanges();

    this.accountService.delete(id)
      .pipe(first())
      .subscribe(() => {
        this.accounts = this.accounts.filter(x => x.id !== id);
        this.cdr.detectChanges();
      });
  }
}
```

### Admin Layout Component

Path: /src/app/admin/layout.component.ts

The admin layout component is the root component of the admin feature / section of
the boilerplate app, it is bound to the admin layout template with the `templateUrl`
property of the angular `@Component` decorator.

```ts
import { Component } from '@angular/core';

@Component({ selector: 'app-admin-layout', templateUrl: 'layout.component.html', standalone: false })
export class LayoutComponent { }
```

### Admin Overview Component

Path: /src/app/admin/overview.component.ts

The admin overview component is the default component of the admin section of the
boilerplate app, it is bound to the admin overview template with the `templateUrl`
property of the angular `@Component` decorator.

```ts
import { Component } from '@angular/core';

@Component({ templateUrl: 'overview.component.html', standalone: false })
export class OverviewComponent { }
```

### Admin Sub Nav Component

Path: /src/app/admin/subnav.component.ts

The admin sub nav component contains the class for the admin sub nav template, it is
bound to the template with the `templateUrl` property of the angular `@Component`
decorator.

```ts
import { Component } from '@angular/core';

@Component({ templateUrl: 'subnav.component.html', standalone: false })
export class SubNavComponent { }
```

### Home Component

Path: /src/app/home/home.component.ts

The home component defines an angular component that gets the current logged in
account from the account service and makes it available to the home template via the
`account` property.

```ts
import { Component } from '@angular/core';

import { AccountService } from '@app/_services';

@Component({ templateUrl: 'home.component.html', standalone: false })
export class HomeComponent {
  constructor(private accountService: AccountService) { }

  get account() {
    return this.accountService.accountValue;
  }
}
```

### Profile Details Component

Path: /src/app/profile/details.component.ts

The profile details component defines an angular component that gets the current
logged in account from the account service and makes it available to the profile
details template via the `account` property.

```ts
import { Component } from '@angular/core';

import { AccountService } from '@app/_services';

@Component({ templateUrl: 'details.component.html', standalone: false })
export class DetailsComponent {
  constructor(private accountService: AccountService) { }

  get account() {
    return this.accountService.accountValue;
  }
}
```

### Profile Layout Component

Path: /src/app/profile/layout.component.ts

The profile layout component is the root component of the profile feature / section of
the boilerplate app, it is bound to the profile layout template with the `templateUrl`
property of the angular `@Component` decorator.

```ts
import { Component } from '@angular/core';

@Component({ selector: 'app-profile-layout', templateUrl: 'layout.component.html', standalone: false })
export class LayoutComponent { }
```

### Account Layout Component Template

Path: /src/app/account/layout.component.html

The account layout component template is the root template of the account feature /
section of the boilerplate app, it contains the outer HTML for account registration,
authentication and verification pages, and a `<router-outlet>` for rendering the
currently routed component.

```html
<div class="container">
  <div class="row">
    <div class="col-lg-8 offset-lg-2 mt-5">
      <div class="card m-3">
        <router-outlet></router-outlet>
      </div>
    </div>
  </div>
</div>
```

### Account Layout Component

Path: /src/app/account/layout.component.ts

The account layout component is the root component of the account feature / section
of the boilerplate app, it is bound to the account layout template with the `templateUrl`
property of the angular `@Component` decorator, and automatically redirects the user to
the home page if they are already logged in.

```ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';

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
```
