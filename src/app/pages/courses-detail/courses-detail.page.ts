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

  get total(): number {
    return this.list ? this.list.articles.reduce((sum, a) => sum + a.prix, 0) : 0;
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
    if (!this.list || !this.intitule.trim() || !this.prix || this.prix <= 0) return;

    this.list.articles.push({ intitule: this.intitule.trim(), prix: this.prix });
    this.intitule = '';
    this.prix = null;
    await this.coursesService.updateCourseList(this.list);
  }

  async removeArticle(index: number) {
    if (!this.list) return;
    this.list.articles.splice(index, 1);
    await this.coursesService.updateCourseList(this.list);
  }

  async validerCourses() {
    if (!this.list || this.list.articles.length === 0) return;

    const message = this.list.validated && this.list.selfPaid
      ? `Mettre à jour la dépense associée avec le nouveau total de ${this.total.toFixed(2)}€ ?`
      : `Valider et enregistrer ${this.total.toFixed(2)}€ dans vos dépenses ?`;

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
      message: `Valider cette liste pour ${this.total.toFixed(2)}€ sans l'ajouter à vos dépenses ?`,
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
