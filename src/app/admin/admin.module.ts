import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminLayoutComponent } from './layout/layout.component';
import { AdminOverviewComponent } from './overview/overview.component';
import { SubNavComponent } from './subnav.component';
import { AccountsComponent } from './accounts/accounts/accounts.component';
import { ListComponent } from './accounts/list/list.component';
import { AddEditComponent } from './accounts/add-edit/add-edit.component';

@NgModule({
  declarations: [
    SubNavComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AdminRoutingModule,
    AdminLayoutComponent,
    AdminOverviewComponent,
    AccountsComponent,
    ListComponent,
    AddEditComponent
  ]
})
export class AdminModule { }
