import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { BudgetService, Transaction } from 'src/app/services/budget.service';
import { CategoriesService } from 'src/app/services/categories.service';

@Component({
  selector: 'app-add',
  templateUrl: './add.page.html',
  styleUrls: ['./add.page.scss'],
  standalone: false,
})
export class AddPage {
  transaction: Partial<Transaction> = {
    date: new Date().toISOString(),
    type: 'apport',
    categorie: '',
    montant: 0,
    commentaire: ''
  };

  categories: Record<string, string[]> = {
    apport: [],
    depense: [],
    virement: ['epargne+', 'epargne-']
  };

  constructor(private budgetService: BudgetService, private categoriesService: CategoriesService, private router: Router) {}

  async ionViewWillEnter() {
    const cats = await this.categoriesService.getCategories();
    this.categories['apport'] = cats.apport;
    this.categories['depense'] = cats.depense;
  }

  async save() {
    if (!this.transaction.categorie || !this.transaction.montant || !this.transaction.type) return;

    await this.budgetService.addTransaction(this.transaction as Omit<Transaction, 'id' | 'userId'>);
    this.router.navigateByUrl('/home');
  }
}
