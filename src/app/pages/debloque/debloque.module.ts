import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DebloquePageRoutingModule } from './debloque-routing.module';

import { DebloquePage } from './debloque.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DebloquePageRoutingModule
  ],
  declarations: [DebloquePage]
})
export class DebloquePageModule {}
