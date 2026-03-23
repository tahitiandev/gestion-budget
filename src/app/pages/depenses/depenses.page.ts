import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BudgetService, Transaction } from '../../services/budget.service';
import { CategoriesService } from '../../services/categories.service';

@Component({
  selector: 'app-depenses',
  templateUrl: './depenses.page.html',
  styleUrls: ['./depenses.page.scss'],
  standalone: false,
})
export class DepensesPage {
  depenses: Transaction[] = [];
  categories: string[] = [];

  depense: Partial<Transaction> = {
    date: new Date().toISOString(),
    type: 'depense',
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
    this.categories = cats.depense;
    await this.loadDepenses();
  }

  async loadDepenses() {
    const all = await this.budgetService.getTransactions();
    this.depenses = all.filter(t => t.type === 'depense').reverse();
  }

  async addDepense() {
    if (!this.depense.categorie || !this.depense.montant) return;

    await this.budgetService.addTransaction(this.depense as Omit<Transaction, 'id' | 'userId'>);

    this.depense = {
      date: new Date().toISOString(),
      type: 'depense',
      categorie: '',
      montant: 0,
      commentaire: ''
    };

    await this.loadDepenses();
  }

  async deleteDepense(id: string) {
    await this.budgetService.deleteTransaction(id);
    await this.loadDepenses();
  }
}
