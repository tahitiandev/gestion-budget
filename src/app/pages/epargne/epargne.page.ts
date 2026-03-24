import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { BudgetService, Transaction } from '../../services/budget.service';

type OperationType = 'courant-epargne' | 'epargne-courant' | 'apport-epargne';

@Component({
  selector: 'app-epargne',
  templateUrl: './epargne.page.html',
  styleUrls: ['./epargne.page.scss'],
  standalone: false,
})
export class EpargnePage {
  soldeEpargne = 0;
  operations: Transaction[] = [];

  operationType: OperationType = 'courant-epargne';
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

    // Calculer le solde épargne
    let epargne = 0;
    for (const t of all) {
      if (t.type === 'virement') {
        if (t.categorie === 'epargne+') epargne += t.montant;
        else if (t.categorie === 'epargne-') epargne -= t.montant;
      } else if (t.type === 'apport' && t.categorie === 'epargne-apport') {
        epargne += t.montant;
      }
    }
    this.soldeEpargne = epargne;

    // Opérations liées à l'épargne
    this.operations = all
      .filter(t =>
        (t.type === 'virement' && (t.categorie === 'epargne+' || t.categorie === 'epargne-')) ||
        (t.type === 'apport' && t.categorie === 'epargne-apport')
      )
      .reverse();
  }

  selectInput(event: any) {
    event.target.getInputElement().then((el: HTMLInputElement) => el.select());
  }

  async addOperation() {
    if (!this.montant || this.montant <= 0) return;

    let transaction: Omit<Transaction, 'id' | 'userId'>;

    if (this.operationType === 'courant-epargne') {
      transaction = {
        date: new Date().toISOString(),
        type: 'virement',
        categorie: 'epargne+',
        montant: this.montant,
        commentaire: this.commentaire || 'Transfert vers épargne'
      };
    } else if (this.operationType === 'epargne-courant') {
      transaction = {
        date: new Date().toISOString(),
        type: 'virement',
        categorie: 'epargne-',
        montant: this.montant,
        commentaire: this.commentaire || 'Retrait épargne'
      };
    } else {
      transaction = {
        date: new Date().toISOString(),
        type: 'apport',
        categorie: 'epargne-apport',
        montant: this.montant,
        commentaire: this.commentaire || 'Entrée directe épargne'
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
    if (t.categorie === 'epargne+') return 'Courant → Épargne';
    if (t.categorie === 'epargne-') return 'Épargne → Courant';
    if (t.categorie === 'epargne-apport') return 'Entrée directe';
    return t.categorie;
  }

  getOperationSign(t: Transaction): string {
    if (t.categorie === 'epargne-') return '-';
    return '+';
  }

  getOperationColor(t: Transaction): string {
    if (t.categorie === 'epargne-') return 'danger';
    return 'success';
  }
}
