import {
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { Menu } from 'src/models/models';
import { MatSidenav } from '@angular/material/sidenav';
import { Router } from '@angular/router';

@Component({
  selector: 'app-side-nav',
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
})
export class SideNavComponent implements OnInit {
  @Input() menu!: Menu[];

  @ViewChild('drawer') drawer!: MatSidenav;

  constructor(private router: Router) {}

  ngOnInit() {}

  toggle() {
    this.drawer.toggle();
  }

  navigateTo(route: string | undefined) {
    if (route) {
      this.router.navigate([route]);
    }
  }
}
