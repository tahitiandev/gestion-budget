import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BudgetService, Transaction } from '../../services/budget.service';
import { CategoriesService } from '../../services/categories.service';

@Component({
  selector: 'app-revenus',
  templateUrl: './revenus.page.html',
  styleUrls: ['./revenus.page.scss'],
  standalone: false,
})
export class RevenusPage {
  revenus: Transaction[] = [];
  categories: string[] = [];

  revenu: Partial<Transaction> = {
    date: new Date().toISOString(),
    type: 'apport',
    categorie: '',
    montant: 0,
    commentaire: ''
  };

  showBackButton = false;

  constructor(private budgetService: BudgetService, private categoriesService: CategoriesService, private route: ActivatedRoute) {
    this.showBackButton = this.route.snapshot.queryParams['from'] === 'home';
  }

  async ionViewWillEnter() {
    const cats = await this.categoriesService.getCategories();
    this.categories = cats.apport;
    await this.loadRevenus();
  }

  async loadRevenus() {
    const all = await this.budgetService.getTransactions();
    this.revenus = all.filter(t => t.type === 'apport').reverse();
  }

  async addRevenu() {
    if (!this.revenu.categorie || !this.revenu.montant) return;

    await this.budgetService.addTransaction(this.revenu as Omit<Transaction, 'id' | 'userId'>);

    this.revenu = {
      date: new Date().toISOString(),
      type: 'apport',
      categorie: '',
      montant: 0,
      commentaire: ''
    };

    await this.loadRevenus();
  }

  async deleteRevenu(id: string) {
    await this.budgetService.deleteTransaction(id);
    await this.loadRevenus();
  }
}
