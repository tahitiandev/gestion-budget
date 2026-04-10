import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { BudgetService, Transaction } from '../../services/budget.service';
import { CategoriesService, FixedCharge } from '../../services/categories.service';

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
  fixedCharges: FixedCharge[] = [];
  fixedResources: FixedCharge[] = [];

  get isFixedCharges(): boolean {
    return this.categorie === '__charges_fixes__';
  }

  get isFixedResources(): boolean {
    return this.categorie === '__ressources_fixes__';
  }

  get isFixedOperation(): boolean {
    return this.isFixedCharges || this.isFixedResources;
  }

  private readonly TRANSFER_LABELS: Record<string, string> = {
    'transfert-epargne': 'Transfert vers cpt épargne',
    'transfert-deblock': 'Transfert vers Deblock',
    'transfert-epargne-cc': 'Transfert épargne vers cc',
    'transfert-deblock-cc': 'Transfert Deblock vers cc'
  };

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
    const [cats, fixedCharges, fixedResources] = await Promise.all([
      this.categoriesService.getCategories(),
      this.categoriesService.getFixedCharges(),
      this.categoriesService.getFixedResources()
    ]);
    this.categoriesApport = cats.apport;
    this.categoriesDepense = cats.depense;
    this.fixedCharges = fixedCharges;
    this.fixedResources = fixedResources;
    await this.loadData();
  }

  get categories(): { value: string; label: string }[] {
    if (this.operationType === 'apport') {
      const cats = this.categoriesApport.map(c => ({
        value: c,
        label: this.TRANSFER_LABELS[c] || c
      }));
      if (this.fixedResources.length > 0) {
        cats.unshift({ value: '__ressources_fixes__', label: 'Ajouter les ressources fixes' });
      }
      return cats;
    }
    const cats = this.categoriesDepense.map(c => ({
      value: c,
      label: this.TRANSFER_LABELS[c] || c
    }));
    if (this.fixedCharges.length > 0) {
      cats.unshift({ value: '__charges_fixes__', label: 'Ajouter les charges fixes' });
    }
    return cats;
  }

  private isTransfert(categorie: string): boolean {
    return ['transfert-epargne', 'transfert-deblock', 'transfert-epargne-cc', 'transfert-deblock-cc'].includes(categorie);
  }

  onTypeChange() {
    this.categorie = '';
  }

  async loadData() {
    await this.budgetService.syncDone;
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
        else if (t.categorie === 'deblock-courant') courant += t.montant;
      }
    }
    this.soldeCourant = courant;

    this.operations = all
      .filter(t =>
        (t.type === 'apport' && t.categorie !== 'epargne-apport' && t.categorie !== 'deblock-apport') ||
        t.type === 'depense' ||
        (t.type === 'virement' && ['epargne+', 'epargne-', 'deblock+', 'deblock-courant'].includes(t.categorie))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  selectInput(event: any) {
    event.target.getInputElement().then((el: HTMLInputElement) => el.select());
  }

  async addOperation() {
    if (this.isFixedCharges) {
      await this.addFixedChargesAsTransactions();
      return;
    }
    if (this.isFixedResources) {
      await this.addFixedResourcesAsTransactions();
      return;
    }

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
    } else if (this.categorie === 'transfert-epargne-cc') {
      transaction = {
        date: new Date().toISOString(),
        type: 'virement',
        categorie: 'epargne-',
        montant: this.montant,
        commentaire: this.commentaire || 'Transfert épargne vers courant'
      };
    } else if (this.categorie === 'transfert-deblock-cc') {
      transaction = {
        date: new Date().toISOString(),
        type: 'virement',
        categorie: 'deblock-courant',
        montant: this.montant,
        commentaire: this.commentaire || 'Transfert Deblock vers courant'
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
    if (t.categorie === 'epargne-') return 'Transfert épargne vers cc';
    if (t.categorie === 'deblock+') return 'Transfert vers Deblock';
    if (t.categorie === 'deblock-courant') return 'Transfert Deblock vers cc';
    if (t.categorie === 'charge-fixe') return 'Charge fixe';
    if (t.categorie === 'ressource-fixe') return 'Ressource fixe';
    return t.categorie.charAt(0).toUpperCase() + t.categorie.slice(1);
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

  private async addFixedChargesAsTransactions() {
    const now = new Date().toISOString();
    for (const charge of this.fixedCharges) {
      if (charge.montant > 0) {
        await this.budgetService.addTransaction({
          date: now,
          type: 'depense',
          categorie: 'charge-fixe',
          montant: charge.montant,
          commentaire: charge.intitule
        });
      }
    }
    this.categorie = '';
    await this.loadData();
  }

  private async addFixedResourcesAsTransactions() {
    const now = new Date().toISOString();
    for (const resource of this.fixedResources) {
      if (resource.montant > 0) {
        await this.budgetService.addTransaction({
          date: now,
          type: 'apport',
          categorie: 'ressource-fixe',
          montant: resource.montant,
          commentaire: resource.intitule
        });
      }
    }
    this.categorie = '';
    await this.loadData();
  }
}
