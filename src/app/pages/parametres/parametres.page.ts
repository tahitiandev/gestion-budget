import { Component } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { CategoriesService, UserCategories, DefaultOperation, FixedCharge, PROTECTED_CATEGORIES } from '../../services/categories.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-parametres',
  templateUrl: './parametres.page.html',
  styleUrls: ['./parametres.page.scss'],
  standalone: false,
})
export class ParametresPage {
  categories: UserCategories = { depense: [], apport: [] };
  newDepense = '';
  newApport = '';
  darkMode = false;
  defaults: DefaultOperation = { type: 'depense', categorieApport: '', categorieDepense: '' };

  fixedCharges: FixedCharge[] = [];
  newChargeIntitule = '';
  newChargeMontant: number = 0;

  constructor(
    private categoriesService: CategoriesService,
    private alertController: AlertController,
    private themeService: ThemeService
  ) {}

  async ionViewWillEnter() {
    this.categories = await this.categoriesService.getCategories();
    this.darkMode = await this.themeService.isDarkMode();
    this.defaults = await this.categoriesService.getDefaultOperation();
    this.fixedCharges = await this.categoriesService.getFixedCharges();
  }

  async toggleDarkMode() {
    await this.themeService.setDarkMode(this.darkMode);
  }

  async saveDefaults() {
    await this.categoriesService.saveDefaultOperation(this.defaults);
  }

  async addDepenseCategory() {
    const name = this.newDepense.trim().toLowerCase();
    if (!name) return;
    await this.categoriesService.addCategory('depense', name);
    this.categories = await this.categoriesService.getCategories();
    this.newDepense = '';
  }

  async addApportCategory() {
    const name = this.newApport.trim().toLowerCase();
    if (!name) return;
    await this.categoriesService.addCategory('apport', name);
    this.categories = await this.categoriesService.getCategories();
    this.newApport = '';
  }

  async reorderCategories(type: 'depense' | 'apport', event: any) {
    const from = event.detail.from;
    const to = event.detail.to;
    const list = this.categories[type];
    const item = list.splice(from, 1)[0];
    list.splice(to, 0, item);
    event.detail.complete();
    await this.categoriesService.saveCategories(this.categories);
  }

  private readonly TRANSFER_LABELS: Record<string, string> = {
    'transfert-epargne': 'Transfert vers cpt épargne',
    'transfert-deblock': 'Transfert vers Deblock',
    'transfert-epargne-cc': 'Transfert épargne vers cc',
    'transfert-deblock-cc': 'Transfert Deblock vers cc'
  };

  isProtected(name: string): boolean {
    return PROTECTED_CATEGORIES.includes(name);
  }

  getCategoryLabel(name: string): string {
    return this.TRANSFER_LABELS[name] || name;
  }

  async renameCategory(type: 'depense' | 'apport', name: string) {
    if (this.isProtected(name)) return;
    const alert = await this.alertController.create({
      header: 'Renommer',
      inputs: [{ name: 'newName', type: 'text', value: name, placeholder: 'Nouveau nom' }],
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Valider',
          handler: async (data) => {
            const newName = data.newName?.trim().toLowerCase();
            if (!newName || newName === name) return;
            await this.categoriesService.renameCategory(type, name, newName);
            this.categories = await this.categoriesService.getCategories();
          }
        }
      ]
    });
    await alert.present();
  }

  async removeCategory(type: 'depense' | 'apport', name: string) {
    const alert = await this.alertController.create({
      header: 'Supprimer',
      message: `Supprimer la catégorie "${name}" ?`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: async () => {
            await this.categoriesService.removeCategory(type, name);
            this.categories = await this.categoriesService.getCategories();
          }
        }
      ]
    });
    await alert.present();
  }

  // ── Charges fixes ──

  async addFixedCharge() {
    const intitule = this.newChargeIntitule.trim();
    if (!intitule || !this.newChargeMontant || this.newChargeMontant <= 0) return;
    await this.categoriesService.addFixedCharge(intitule, this.newChargeMontant);
    this.fixedCharges = await this.categoriesService.getFixedCharges();
    this.newChargeIntitule = '';
    this.newChargeMontant = 0;
  }

  async editFixedCharge(charge: FixedCharge) {
    const alert = await this.alertController.create({
      header: 'Modifier la charge',
      inputs: [
        { name: 'intitule', type: 'text', value: charge.intitule, placeholder: 'Intitulé' },
        { name: 'montant', type: 'number', value: charge.montant, placeholder: 'Montant' }
      ],
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Valider',
          handler: async (data) => {
            const intitule = data.intitule?.trim();
            const montant = parseFloat(data.montant);
            if (!intitule || !montant || montant <= 0) return;
            await this.categoriesService.updateFixedCharge(charge.id, { intitule, montant });
            this.fixedCharges = await this.categoriesService.getFixedCharges();
          }
        }
      ]
    });
    await alert.present();
  }

  async removeFixedCharge(charge: FixedCharge) {
    const alert = await this.alertController.create({
      header: 'Supprimer',
      message: `Supprimer la charge "${charge.intitule}" ?`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: async () => {
            await this.categoriesService.removeFixedCharge(charge.id);
            this.fixedCharges = await this.categoriesService.getFixedCharges();
          }
        }
      ]
    });
    await alert.present();
  }

  selectInput(event: any) {
    event.target.getInputElement().then((el: HTMLInputElement) => el.select());
  }
}
