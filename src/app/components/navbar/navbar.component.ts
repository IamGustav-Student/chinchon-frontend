import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { InboxService } from '../../services/inbox.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, DecimalPipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit {
  auth   = inject(AuthService);
  inbox  = inject(InboxService);
  private router = inject(Router);

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.inbox.fetchUnread();
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
