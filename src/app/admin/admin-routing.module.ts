import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/layout.component';
import { AdminOverviewComponent } from './overview/overview.component';
import { SubNavComponent } from './subnav.component';
import { AccountsComponent } from './accounts/accounts/accounts.component';
import { ListComponent } from './accounts/list/list.component';
import { AddEditComponent } from './accounts/add-edit/add-edit.component';

const routes: Routes = [
  {
    path: '', 
    component: AdminLayoutComponent,
    children: [
      { path: '', component: AdminOverviewComponent },
      { path: 'subnav', component: SubNavComponent },
      {
        path: 'accounts', 
        component: AccountsComponent,
        children: [
          { path: '', component: ListComponent },
          { path: 'add', component: AddEditComponent },
          { path: 'edit/:id', component: AddEditComponent }
        ]
      }
    ]
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    AdminLayoutComponent,
    AdminOverviewComponent,
    AccountsComponent,
    ListComponent,
    AddEditComponent
  ],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
