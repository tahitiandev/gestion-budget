import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CoursesDetailPageRoutingModule } from './courses-detail-routing.module';

import { CoursesDetailPage } from './courses-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CoursesDetailPageRoutingModule
  ],
  declarations: [CoursesDetailPage]
})
export class CoursesDetailPageModule {}
