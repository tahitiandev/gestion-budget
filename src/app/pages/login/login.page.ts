import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  email = '';
  password = '';
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  async login() {
    try {
      this.errorMessage = '';
      await this.authService.login(this.email, this.password);
      this.router.navigateByUrl('/home');
    } catch (e: any) {
      this.errorMessage = e.message;
    }
  }
}
