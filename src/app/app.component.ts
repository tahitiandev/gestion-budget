import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import { BudgetService } from './services/budget.service';
import { CoursesService } from './services/courses.service';
import { CategoriesService } from './services/categories.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  userEmail: string | null = null;

  constructor(private authService: AuthService, private budgetService: BudgetService, private coursesService: CoursesService, private categoriesService: CategoriesService) {}

  ngOnInit() {
    this.authService.authState$.subscribe(user => {
      this.userEmail = user?.email ?? null;
      if (user) {
        this.budgetService.syncDone = this.budgetService.syncFromFirestore();
        this.coursesService.syncFromFirestore();
        this.categoriesService.syncFromFirestore();
      }
    });
  }

  async logout() {
    await this.authService.logout();
  }
}
