import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'src/quards/auth.guard';
import { ValidateTokenGuard } from 'src/quards/validateToken.guard';
import { ContainerComponent } from './components/container/container.component';
import { NotFoundComponent } from './components/not-found/not-found.component';

const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('../modules/main/main.module').then((m) => m.MainModule),
    // canActivate: [AuthGuard, ValidateTokenGuard],
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('../modules/admin/admin.module').then((m) => m.AdminModule),
    // canActivate: [AuthGuard, ValidateTokenGuard],
  },
  { path: 'login', component: ContainerComponent },
  { path: 'not-found', component: NotFoundComponent },
  { path: '**', redirectTo: '/not-found' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
