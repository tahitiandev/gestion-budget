import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { BudgetService, Transaction } from '../../services/budget.service';
import { CategoriesService } from '../../services/categories.service';

@Component({
  selector: 'app-courant',
  templateUrl: './courant.page.html',
  styleUrls: ['./courant.page.scss'],
  standalone: false,
})
export class CourantPage {
  soldeCourant = 0;
  operations: Transaction[] = [];

  operationType: 'apport' | 'depense' = 'apport';
  categorie = '';
  montant: number = 0;
  commentaire = '';

  categoriesApport: string[] = [];
  categoriesDepense: string[] = [];

  showBackButton = false;

  constructor(
    private budgetService: BudgetService,
    private categoriesService: CategoriesService,
    private alertController: AlertController,
    private route: ActivatedRoute
  ) {
    this.showBackButton = this.route.snapshot.queryParams['from'] === 'home';
  }

  async ionViewWillEnter() {
    const cats = await this.categoriesService.getCategories();
    this.categoriesApport = cats.apport;
    this.categoriesDepense = cats.depense;
    await this.loadData();
  }

  get categories(): string[] {
    return this.operationType === 'apport' ? this.categoriesApport : this.categoriesDepense;
  }

  onTypeChange() {
    this.categorie = '';
  }

  async loadData() {
    const all = await this.budgetService.getTransactions();

    let courant = 0;
    for (const t of all) {
      if (t.type === 'apport' && t.categorie !== 'epargne-apport' && t.categorie !== 'deblock-apport') {
        courant += t.montant;
      } else if (t.type === 'depense') {
        courant -= t.montant;
      } else if (t.type === 'virement') {
        if (t.categorie === 'epargne+') courant -= t.montant;
        else if (t.categorie === 'epargne-') courant += t.montant;
        else if (t.categorie === 'deblock+') courant -= t.montant;
      }
    }
    this.soldeCourant = courant;

    this.operations = all
      .filter(t =>
        (t.type === 'apport' && t.categorie !== 'epargne-apport' && t.categorie !== 'deblock-apport') ||
        t.type === 'depense'
      )
      .reverse();
  }

  selectInput(event: any) {
    event.target.getInputElement().then((el: HTMLInputElement) => el.select());
  }

  async addOperation() {
    if (!this.montant || this.montant <= 0 || !this.categorie) return;

    const transaction: Omit<Transaction, 'id' | 'userId'> = {
      date: new Date().toISOString(),
      type: this.operationType,
      categorie: this.categorie,
      montant: this.montant,
      commentaire: this.commentaire || ''
    };

    await this.budgetService.addTransaction(transaction);

    this.montant = 0;
    this.commentaire = '';
    this.categorie = '';
    await this.loadData();
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
            await this.loadData();
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteOperation(id: string) {
    await this.budgetService.deleteTransaction(id);
    await this.loadData();
  }

  getOperationSign(t: Transaction): string {
    return t.type === 'depense' ? '-' : '+';
  }

  getOperationColor(t: Transaction): string {
    return t.type === 'depense' ? 'danger' : 'success';
  }

  getDescription(t: Transaction): string {
    if (t.categorie === 'course') {
      const d = new Date(t.date);
      const jj = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const aa = String(d.getFullYear()).slice(-2);
      return `Course du ${jj}/${mm}/${aa}`;
    }
    return t.commentaire || '';
  }
}
