import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CourantPageRoutingModule } from './courant-routing.module';

import { CourantPage } from './courant.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CourantPageRoutingModule
  ],
  declarations: [CourantPage]
})
export class CourantPageModule {}
