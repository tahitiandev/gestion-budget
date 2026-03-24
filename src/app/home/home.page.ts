import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { BudgetService, Transaction } from '../services/budget.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  transactions: Transaction[] = [];
  soldeTotal: number = 0;
  soldeEpargne: number = 0;
  soldeDebloque: number = 0;
  loading = true;

  constructor(private budgetService: BudgetService, private alertController: AlertController) {}

  async ngOnInit() {
    await this.loadData();
  }

  async ionViewWillEnter() {
    await this.loadData();
  }

  async loadData() {
    this.loading = true;
    await this.budgetService.syncDone;
    this.transactions = await this.budgetService.getTransactions();
    this.calculerSoldes();
    this.loading = false;
  }

  calculerSoldes() {
    let total = 0;
    let epargne = 0;
    let debloque = 0;

    for (let t of this.transactions) {
      if (t.type === 'apport') {
        if (t.categorie === 'epargne-apport') {
          epargne += t.montant;
        } else if (t.categorie === 'debloque-apport') {
          debloque += t.montant;
        } else {
          total += t.montant;
        }
      } else if (t.type === 'depense') {
        total -= t.montant;
      } else if (t.type === 'virement') {
        if (t.categorie === 'epargne+') {
          total -= t.montant;
          epargne += t.montant;
        } else if (t.categorie === 'epargne-') {
          total += t.montant;
          epargne -= t.montant;
        } else if (t.categorie === 'debloque+') {
          total -= t.montant;
          debloque += t.montant;
        } else if (t.categorie === 'debloque-epargne') {
          epargne -= t.montant;
          debloque += t.montant;
        } else if (t.categorie === 'debloque-depense') {
          debloque -= t.montant;
        }
      }
    }

    this.soldeTotal = total;
    this.soldeEpargne = epargne;
    this.soldeDebloque = debloque;
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

  async deleteTransaction(id: string) {
    await this.budgetService.deleteTransaction(id);
    await this.loadData();
  }
}
