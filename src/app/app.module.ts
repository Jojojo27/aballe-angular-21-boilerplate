import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideAppInitializer, inject } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { JwtInterceptor, ErrorInterceptor, FakeBackendInterceptor, appInitializer } from './_helpers';
import { AccountService } from './_services';
import { AppComponent } from './app.component';
import { AlertComponent } from './_components';
import { HomeComponent } from './home';

@NgModule({
    imports: [
        BrowserModule,
        ReactiveFormsModule,
        AppRoutingModule
    ],
    declarations: [
        AppComponent,
        AlertComponent,
        HomeComponent
    ],
    providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideAppInitializer(() => appInitializer(inject(AccountService))()),
        { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
        // ─── STAGE A: Uncomment the line below to use the Fake Backend (no real API needed) ───
        // ─── STAGE B: Keep it commented out to use the real deployed API ───────────────────────
        // { provide: HTTP_INTERCEPTORS, useClass: FakeBackendInterceptor, multi: true }
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
