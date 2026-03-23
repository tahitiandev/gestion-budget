import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { CoursesService, CourseList } from '../../services/courses.service';

@Component({
  selector: 'app-courses',
  templateUrl: './courses.page.html',
  styleUrls: ['./courses.page.scss'],
  standalone: false,
})
export class CoursesPage {
  courseLists: CourseList[] = [];

  constructor(
    private coursesService: CoursesService,
    private alertController: AlertController,
    private router: Router
  ) {}

  async ionViewWillEnter() {
    await this.loadLists();
  }

  async loadLists() {
    const all = await this.coursesService.getCourseLists();
    this.courseLists = all.sort((a, b) => b.date.localeCompare(a.date));
  }

  async createNewList() {
    const list = await this.coursesService.createCourseList();
    this.router.navigate(['/courses/detail', list.id]);
  }

  openList(id: string) {
    this.router.navigate(['/courses/detail', id]);
  }

  async deleteList(id: string) {
    const alert = await this.alertController.create({
      header: 'Supprimer',
      message: 'Supprimer cette liste de courses et la dépense associée ?',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: async () => {
            await this.coursesService.deleteCourseList(id);
            await this.loadLists();
          }
        }
      ]
    });
    await alert.present();
  }
}
