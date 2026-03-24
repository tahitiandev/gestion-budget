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

  private readonly TRANSFERTS = [
    { value: 'transfert-epargne', label: 'Transfert vers cpt épargne' },
    { value: 'transfert-deblock', label: 'Transfert vers Deblock' }
  ];

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

  get categories(): { value: string; label: string }[] {
    if (this.operationType === 'apport') {
      return this.categoriesApport.map(c => ({ value: c, label: c }));
    }
    return [
      ...this.categoriesDepense.map(c => ({ value: c, label: c })),
      ...this.TRANSFERTS
    ];
  }

  private isTransfert(categorie: string): boolean {
    return categorie === 'transfert-epargne' || categorie === 'transfert-deblock';
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
        t.type === 'depense' ||
        (t.type === 'virement' && (t.categorie === 'epargne+' || t.categorie === 'deblock+'))
      )
      .reverse();
  }

  selectInput(event: any) {
    event.target.getInputElement().then((el: HTMLInputElement) => el.select());
  }

  async addOperation() {
    if (!this.montant || this.montant <= 0 || !this.categorie) return;

    let transaction: Omit<Transaction, 'id' | 'userId'>;

    if (this.categorie === 'transfert-epargne') {
      transaction = {
        date: new Date().toISOString(),
        type: 'virement',
        categorie: 'epargne+',
        montant: this.montant,
        commentaire: this.commentaire || 'Transfert vers épargne'
      };
    } else if (this.categorie === 'transfert-deblock') {
      transaction = {
        date: new Date().toISOString(),
        type: 'virement',
        categorie: 'deblock+',
        montant: this.montant,
        commentaire: this.commentaire || 'Transfert vers Deblock'
      };
    } else {
      transaction = {
        date: new Date().toISOString(),
        type: this.operationType,
        categorie: this.categorie,
        montant: this.montant,
        commentaire: this.commentaire || ''
      };
    }

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
    return (t.type === 'depense' || t.categorie === 'epargne+' || t.categorie === 'deblock+') ? '-' : '+';
  }

  getOperationColor(t: Transaction): string {
    return (t.type === 'depense' || t.categorie === 'epargne+' || t.categorie === 'deblock+') ? 'danger' : 'success';
  }

  getOperationLabel(t: Transaction): string {
    if (t.categorie === 'epargne+') return 'Transfert vers épargne';
    if (t.categorie === 'deblock+') return 'Transfert vers Deblock';
    return t.categorie;
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
