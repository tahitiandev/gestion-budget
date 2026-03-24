import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DeblockPage } from './deblock.page';

const routes: Routes = [
  {
    path: '',
    component: DeblockPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DeblockPageRoutingModule {}
