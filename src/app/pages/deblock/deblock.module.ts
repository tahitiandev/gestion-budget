import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DeblockPageRoutingModule } from './deblock-routing.module';

import { DeblockPage } from './deblock.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DeblockPageRoutingModule
  ],
  declarations: [DeblockPage]
})
export class DeblockPageModule {}
