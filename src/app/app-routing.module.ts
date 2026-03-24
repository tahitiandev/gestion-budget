import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/register/register.module').then(m => m.RegisterPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'courant',
    loadChildren: () => import('./pages/courant/courant.module').then(m => m.CourantPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'epargne',
    loadChildren: () => import('./pages/epargne/epargne.module').then(m => m.EpargnePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'deblock',
    loadChildren: () => import('./pages/deblock/deblock.module').then(m => m.DeblockPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'courses',
    loadChildren: () => import('./pages/courses/courses.module').then(m => m.CoursesPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'courses/detail/:id',
    loadChildren: () => import('./pages/courses-detail/courses-detail.module').then(m => m.CoursesDetailPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'parametres',
    loadChildren: () => import('./pages/parametres/parametres.module').then(m => m.ParametresPageModule),
    canActivate: [AuthGuard]
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
