import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RevenusPageRoutingModule } from './revenus-routing.module';

import { RevenusPage } from './revenus.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RevenusPageRoutingModule
  ],
  declarations: [RevenusPage]
})
export class RevenusPageModule {}
