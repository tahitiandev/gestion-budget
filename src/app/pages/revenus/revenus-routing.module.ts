import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RevenusPage } from './revenus.page';

const routes: Routes = [
  {
    path: '',
    component: RevenusPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RevenusPageRoutingModule {}
