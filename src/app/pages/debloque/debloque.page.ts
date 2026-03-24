import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { BudgetService, Transaction } from '../../services/budget.service';

type OperationType = 'courant-debloque' | 'epargne-debloque' | 'apport-debloque' | 'depense-debloque';

@Component({
  selector: 'app-debloque',
  templateUrl: './debloque.page.html',
  styleUrls: ['./debloque.page.scss'],
  standalone: false,
})
export class DebloquePage {
  soldeDebloque = 0;
  operations: Transaction[] = [];

  operationType: OperationType = 'courant-debloque';
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

    let debloque = 0;
    for (const t of all) {
      if (t.type === 'virement') {
        if (t.categorie === 'debloque+') debloque += t.montant;
        else if (t.categorie === 'debloque-epargne') debloque += t.montant;
        else if (t.categorie === 'debloque-depense') debloque -= t.montant;
      } else if (t.type === 'apport' && t.categorie === 'debloque-apport') {
        debloque += t.montant;
      }
    }
    this.soldeDebloque = debloque;

    this.operations = all
      .filter(t =>
        (t.type === 'virement' && ['debloque+', 'debloque-epargne', 'debloque-depense'].includes(t.categorie)) ||
        (t.type === 'apport' && t.categorie === 'debloque-apport')
      )
      .reverse();
  }

  async addOperation() {
    if (!this.montant || this.montant <= 0) return;

    let transaction: Omit<Transaction, 'id' | 'userId'>;

    if (this.operationType === 'courant-debloque') {
      transaction = {
        date: new Date().toISOString(),
        type: 'virement',
        categorie: 'debloque+',
        montant: this.montant,
        commentaire: this.commentaire || 'Transfert courant → débloqué'
      };
    } else if (this.operationType === 'epargne-debloque') {
      transaction = {
        date: new Date().toISOString(),
        type: 'virement',
        categorie: 'debloque-epargne',
        montant: this.montant,
        commentaire: this.commentaire || 'Transfert épargne → débloqué'
      };
    } else if (this.operationType === 'apport-debloque') {
      transaction = {
        date: new Date().toISOString(),
        type: 'apport',
        categorie: 'debloque-apport',
        montant: this.montant,
        commentaire: this.commentaire || 'Apport débloqué'
      };
    } else {
      transaction = {
        date: new Date().toISOString(),
        type: 'virement',
        categorie: 'debloque-depense',
        montant: this.montant,
        commentaire: this.commentaire || 'Dépense débloqué'
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
    if (t.categorie === 'debloque+') return 'Courant → Débloqué';
    if (t.categorie === 'debloque-epargne') return 'Épargne → Débloqué';
    if (t.categorie === 'debloque-apport') return 'Apport direct';
    if (t.categorie === 'debloque-depense') return 'Dépense';
    return t.categorie;
  }

  getOperationSign(t: Transaction): string {
    if (t.categorie === 'debloque-depense') return '-';
    return '+';
  }

  getOperationColor(t: Transaction): string {
    if (t.categorie === 'debloque-depense') return 'danger';
    return 'success';
  }
}
