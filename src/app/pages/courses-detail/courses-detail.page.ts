import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { CoursesService, CourseList } from '../../services/courses.service';

@Component({
  selector: 'app-courses-detail',
  templateUrl: './courses-detail.page.html',
  styleUrls: ['./courses-detail.page.scss'],
  standalone: false,
})
export class CoursesDetailPage {
  list: CourseList | null = null;
  intitule = '';
  prix: number | null = null;
  quantite: number | null = null;
  montantRegle: number | null = null;

  get total(): number {
    return this.list ? this.list.articles.reduce((sum, a) => sum + a.prix * (a.quantite ?? 1), 0) : 0;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private coursesService: CoursesService,
    private alertController: AlertController
  ) {}

  async ionViewWillEnter() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.list = (await this.coursesService.getCourseList(id)) || null;
    }
    if (!this.list) {
      this.router.navigate(['/courses']);
    }
  }

  async addArticle() {
    if (!this.list || !this.prix || this.prix <= 0) return;

    this.list.articles.push({
      intitule: this.intitule.trim() || 'Non renseigné',
      prix: this.prix,
      quantite: this.quantite && this.quantite > 0 ? this.quantite : 1
    });
    this.intitule = '';
    this.prix = null;
    this.quantite = null;
    await this.coursesService.updateCourseList(this.list);
  }

  async removeArticle(index: number) {
    if (!this.list) return;
    this.list.articles.splice(index, 1);
    await this.coursesService.updateCourseList(this.list);
  }

  async editArticle(index: number) {
    if (!this.list) return;
    const article = this.list.articles[index];

    const alert = await this.alertController.create({
      header: 'Modifier l\'article',
      inputs: [
        { name: 'intitule', type: 'text', value: article.intitule, placeholder: 'Intitulé' },
        { name: 'prix', type: 'number', value: String(article.prix), placeholder: 'Prix unitaire' },
        { name: 'quantite', type: 'number', value: String(article.quantite ?? 1), placeholder: 'Quantité' }
      ],
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Enregistrer',
          handler: async (data: any) => {
            const prix = parseFloat(data.prix);
            if (isNaN(prix)) return false;
            const quantite = parseFloat(data.quantite);
            article.intitule = data.intitule?.trim() || 'Non renseigné';
            article.prix = prix;
            article.quantite = quantite > 0 ? quantite : 1;
            await this.coursesService.updateCourseList(this.list!);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async appliquerMontantRegle() {
    if (!this.list || this.montantRegle == null) return;

    // Supprimer les lignes d'écart existantes
    this.list.articles = this.list.articles.filter(a => !a.intitule.startsWith('Ecart '));

    // Calculer le total sans écart
    const totalArticles = this.list.articles.reduce((sum, a) => sum + a.prix * (a.quantite ?? 1), 0);
    const diff = this.montantRegle - totalArticles;

    if (diff !== 0) {
      this.list.articles.push({
        intitule: diff > 0 ? 'Ecart +' : 'Ecart -',
        prix: diff,
        quantite: 1
      });
    }

    this.montantRegle = null;
    await this.coursesService.updateCourseList(this.list);
  }

  async validerCourses() {
    if (!this.list || this.list.articles.length === 0) return;

    const message = this.list.validated && this.list.selfPaid
      ? `Mettre à jour la dépense associée avec le nouveau total de ${this.total.toFixed(0)}€ ?`
      : `Valider et enregistrer ${this.total.toFixed(0)}€ dans vos dépenses ?`;

    const alert = await this.alertController.create({
      header: this.list.validated && this.list.selfPaid ? 'Mettre à jour' : 'Confirmer',
      message,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: this.list.validated && this.list.selfPaid ? 'Mettre à jour' : 'Valider',
          handler: async () => {
            await this.coursesService.validateCourseList(this.list!.id);
            this.list = (await this.coursesService.getCourseList(this.list!.id)) || null;
          }
        }
      ]
    });

    await alert.present();
  }

  async validerSansDepense() {
    if (!this.list || this.list.articles.length === 0) return;

    const alert = await this.alertController.create({
      header: 'Valider sans dépense',
      message: `Valider cette liste pour ${this.total.toFixed(0)}€ sans l'ajouter à vos dépenses ?`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Valider',
          handler: async () => {
            await this.coursesService.validateWithoutExpense(this.list!.id);
            this.list = (await this.coursesService.getCourseList(this.list!.id)) || null;
          }
        }
      ]
    });

    await alert.present();
  }
}
