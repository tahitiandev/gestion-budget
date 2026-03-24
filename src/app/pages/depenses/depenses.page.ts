import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';
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

  constructor(private budgetService: BudgetService, private categoriesService: CategoriesService, private alertController: AlertController, private route: ActivatedRoute) {
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

  async editMontant(t: Transaction) {
    const alert = await this.alertController.create({
      header: 'Modifier le montant',
      inputs: [{ name: 'montant', type: 'number', value: t.montant, placeholder: 'Montant' }],
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Valider',
          handler: async (data) => {
            const montant = parseFloat(data.montant);
            if (!montant || montant <= 0) return;
            await this.budgetService.updateTransaction(t.id, { montant });
            await this.loadDepenses();
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteDepense(id: string) {
    await this.budgetService.deleteTransaction(id);
    await this.loadDepenses();
  }
}
