import { Component } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { CategoriesService, UserCategories } from '../../services/categories.service';
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

  constructor(
    private categoriesService: CategoriesService,
    private alertController: AlertController,
    private themeService: ThemeService
  ) {}

  async ionViewWillEnter() {
    this.categories = await this.categoriesService.getCategories();
    this.darkMode = await this.themeService.isDarkMode();
  }

  async toggleDarkMode() {
    await this.themeService.setDarkMode(this.darkMode);
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
}
