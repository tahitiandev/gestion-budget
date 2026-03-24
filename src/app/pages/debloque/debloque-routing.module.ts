import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DebloquePage } from './debloque.page';

const routes: Routes = [
  {
    path: '',
    component: DebloquePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DebloquePageRoutingModule {}
