import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage {
  email = '';
  password = '';
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  async register() {
    try {
      this.errorMessage = '';
      await this.authService.register(this.email, this.password);
      this.router.navigateByUrl('/home');
    } catch (e: any) {
      this.errorMessage = e.message;
    }
  }
}
