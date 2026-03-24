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
    path: 'add',
    loadChildren: () => import('./pages/add/add.module').then(m => m.AddPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'depenses',
    loadChildren: () => import('./pages/depenses/depenses.module').then(m => m.DepensesPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'revenus',
    loadChildren: () => import('./pages/revenus/revenus.module').then(m => m.RevenusPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'epargne',
    loadChildren: () => import('./pages/epargne/epargne.module').then(m => m.EpargnePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'debloque',
    loadChildren: () => import('./pages/debloque/debloque.module').then(m => m.DebloquePageModule),
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
