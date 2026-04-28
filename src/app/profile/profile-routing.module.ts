import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileLayoutComponent } from './layout/layout.component';
import { DetailsComponent } from './details/details.component';
import { UpdateComponent } from './update/update.component';

const routes: Routes = [
  {
    path: '', 
    component: ProfileLayoutComponent,
    children: [
      { path: '', component: DetailsComponent },
      { path: 'update', component: UpdateComponent }
    ]
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    ProfileLayoutComponent,
    DetailsComponent,
    UpdateComponent
  ],
  exports: [RouterModule]
})
export class ProfileRoutingModule { }
