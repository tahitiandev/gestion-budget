import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { BudgetService, Transaction } from '../../services/budget.service';

type OperationType = 'courant-deblock' | 'epargne-deblock' | 'apport-deblock' | 'depense-deblock';

@Component({
  selector: 'app-deblock',
  templateUrl: './deblock.page.html',
  styleUrls: ['./deblock.page.scss'],
  standalone: false,
})
export class DeblockPage {
  soldeDeblock = 0;
  operations: Transaction[] = [];

  operationType: OperationType = 'courant-deblock';
  montant: number = 0;
  commentaire = '';

  showBackButton = false;

  constructor(private budgetService: BudgetService, private alertController: AlertController, private route: ActivatedRoute) {
    this.showBackButton = this.route.snapshot.queryParams['from'] === 'home';
  }

  async ionViewWillEnter() {
    await this.loadData();
  }

  async loadData() {
    const all = await this.budgetService.getTransactions();

    let deblock = 0;
    for (const t of all) {
      if (t.type === 'virement') {
        if (t.categorie === 'deblock+') deblock += t.montant;
        else if (t.categorie === 'deblock-epargne') deblock += t.montant;
        else if (t.categorie === 'deblock-depense') deblock -= t.montant;
      } else if (t.type === 'apport' && t.categorie === 'deblock-apport') {
        deblock += t.montant;
      }
    }
    this.soldeDeblock = deblock;

    this.operations = all
      .filter(t =>
        (t.type === 'virement' && ['deblock+', 'deblock-epargne', 'deblock-depense'].includes(t.categorie)) ||
        (t.type === 'apport' && t.categorie === 'deblock-apport')
      )
      .reverse();
  }

  selectInput(event: any) {
    event.target.getInputElement().then((el: HTMLInputElement) => el.select());
  }

  async addOperation() {
    if (!this.montant || this.montant <= 0) return;

    let transaction: Omit<Transaction, 'id' | 'userId'>;

    if (this.operationType === 'courant-deblock') {
      transaction = {
        date: new Date().toISOString(),
        type: 'virement',
        categorie: 'deblock+',
        montant: this.montant,
        commentaire: this.commentaire || 'Transfert courant → Deblock'
      };
    } else if (this.operationType === 'epargne-deblock') {
      transaction = {
        date: new Date().toISOString(),
        type: 'virement',
        categorie: 'deblock-epargne',
        montant: this.montant,
        commentaire: this.commentaire || 'Transfert épargne → Deblock'
      };
    } else if (this.operationType === 'apport-deblock') {
      transaction = {
        date: new Date().toISOString(),
        type: 'apport',
        categorie: 'deblock-apport',
        montant: this.montant,
        commentaire: this.commentaire || 'Apport Deblock'
      };
    } else {
      transaction = {
        date: new Date().toISOString(),
        type: 'virement',
        categorie: 'deblock-depense',
        montant: this.montant,
        commentaire: this.commentaire || 'Dépense Deblock'
      };
    }

    await this.budgetService.addTransaction(transaction);

    this.montant = 0;
    this.commentaire = '';
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

  getOperationLabel(t: Transaction): string {
    if (t.categorie === 'deblock+') return 'Courant → Deblock';
    if (t.categorie === 'deblock-epargne') return 'Épargne → Deblock';
    if (t.categorie === 'deblock-apport') return 'Apport direct';
    if (t.categorie === 'deblock-depense') return 'Dépense';
    return t.categorie;
  }

  getOperationSign(t: Transaction): string {
    if (t.categorie === 'deblock-depense') return '-';
    return '+';
  }

  getOperationColor(t: Transaction): string {
    if (t.categorie === 'deblock-depense') return 'danger';
    return 'success';
  }
}
