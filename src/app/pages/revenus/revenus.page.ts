import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';
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

  constructor(private budgetService: BudgetService, private categoriesService: CategoriesService, private alertController: AlertController, private route: ActivatedRoute) {
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
            await this.loadRevenus();
          }
        }
      ]
    });
    await alert.present();
  }

  selectInput(event: any) {
    event.target.getInputElement().then((el: HTMLInputElement) => el.select());
  }

  async deleteRevenu(id: string) {
    await this.budgetService.deleteTransaction(id);
    await this.loadRevenus();
  }
}
