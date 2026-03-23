import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CoursesDetailPage } from './courses-detail.page';

const routes: Routes = [
  {
    path: '',
    component: CoursesDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CoursesDetailPageRoutingModule {}
