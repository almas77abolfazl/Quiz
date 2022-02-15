import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'src/quards/auth.guard';
import { ContainerComponent } from './container/container.component';

const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('../modules/main/main.module').then((m) => m.MainModule),
    canActivate: [AuthGuard],
  },
  { path: 'login', component: ContainerComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
