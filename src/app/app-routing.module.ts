import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'src/quards/auth.guard';
import { LoginComponent } from './login/login/login.component';

const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('../modules/main/main.module').then((m) => m.MainModule),
    canActivate: [AuthGuard],
  },
  { path: 'login', component: LoginComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
