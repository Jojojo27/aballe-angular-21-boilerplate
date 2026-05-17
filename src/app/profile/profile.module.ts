import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { ProfileRoutingModule } from './profile-routing.module';
import { ProfileLayoutComponent } from './layout/layout.component';
import { DetailsComponent } from './details/details.component';
import { UpdateComponent } from './update/update.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ProfileRoutingModule,
    ProfileLayoutComponent,
    DetailsComponent,
    UpdateComponent
  ]
})
export class ProfileModule { }
