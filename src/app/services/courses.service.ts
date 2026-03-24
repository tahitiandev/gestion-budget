import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { db } from './firebase.service';
import { AuthService } from './auth.service';
import { BudgetService } from './budget.service';
import { v4 as uuidv4 } from 'uuid';

export interface ArticleCourse {
  intitule: string;
  prix: number;
}

export interface CourseList {
  id: string;
  userId: string;
  date: string;
  articles: ArticleCourse[];
  total: number;
  transactionId?: string;
  validated: boolean;
  selfPaid?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CoursesService {
  private readonly COLLECTION = 'courseLists';
  private readonly STORAGE_KEY = 'courseLists';

  constructor(
    private storage: Storage,
    private authService: AuthService,
    private budgetService: BudgetService
  ) {
    this.init();
  }

  async init() {
    await this.storage.create();
  }

  // ── Local storage ──

  private async getLocal(): Promise<CourseList[]> {
    return (await this.storage.get(this.STORAGE_KEY)) || [];
  }

  private async saveLocal(lists: CourseList[]) {
    await this.storage.set(this.STORAGE_KEY, lists);
  }

  // ── Firestore ──

  private async pushToFirestore(list: CourseList) {
    try {
      await db.collection(this.COLLECTION).doc(list.id).set(list);
    } catch (e) {
      console.error('Firestore push failed', e);
    }
  }

  private async deleteFromFirestore(id: string) {
    try {
      await db.collection(this.COLLECTION).doc(id).delete();
    } catch (e) {
      console.warn('Firestore delete failed (offline?)', e);
    }
  }

  async syncFromFirestore() {
    try {
      const userId = this.authService.getUserId();
      if (!userId) return;

      let query: any = db.collection(this.COLLECTION);
      if (!this.authService.isAdmin()) {
        query = query.where('userId', '==', userId);
      }

      const snapshot = await query.get();
      const remote: CourseList[] = snapshot.docs.map((d: any) => d.data() as CourseList);

      const local = await this.getLocal();

      const merged = new Map<string, CourseList>();
      for (const l of remote) merged.set(l.id, l);
      for (const l of local) merged.set(l.id, l);

      const all = Array.from(merged.values());
      await this.saveLocal(all);

      const remoteIds = new Set(remote.map(l => l.id));
      const batch = db.batch();
      let batchCount = 0;
      for (const l of local) {
        if (!remoteIds.has(l.id) && l.userId === userId) {
          const ref = db.collection(this.COLLECTION).doc(l.id);
          batch.set(ref, l);
          batchCount++;
        }
      }
      if (batchCount > 0) await batch.commit();
    } catch (e) {
      console.warn('Sync courses failed (offline?)', e);
    }
  }

  // ── Public API ──

  async getCourseLists(): Promise<CourseList[]> {
    const all = await this.getLocal();
    const userId = this.authService.getUserId();
    if (this.authService.isAdmin()) return all;
    return all.filter(l => l.userId === userId);
  }

  async getCourseList(id: string): Promise<CourseList | undefined> {
    const all = await this.getLocal();
    return all.find(l => l.id === id);
  }

  async createCourseList(): Promise<CourseList> {
    const userId = this.authService.getUserId()!;
    const list: CourseList = {
      id: uuidv4(),
      userId,
      date: new Date().toISOString(),
      articles: [],
      total: 0,
      validated: false
    };

    const all = await this.getLocal();
    all.push(list);
    await this.saveLocal(all);
    await this.pushToFirestore(list);
    return list;
  }

  async updateCourseList(updated: CourseList) {
    updated.total = updated.articles.reduce((sum, a) => sum + a.prix, 0);

    const all = await this.getLocal();
    const index = all.findIndex(l => l.id === updated.id);
    if (index === -1) return;
    all[index] = updated;
    await this.saveLocal(all);
    await this.pushToFirestore(updated);

    // Si la liste est validée et liée à une transaction, mettre à jour la transaction
    if (updated.validated && updated.transactionId) {
      await this.updateLinkedTransaction(updated);
    }
  }

  async validateCourseList(id: string) {
    const list = await this.getCourseList(id);
    if (!list || list.articles.length === 0) return;

    const detail = list.articles.map(a => `${a.intitule} (${a.prix.toFixed(0)}€)`).join(', ');

    if (list.validated && list.transactionId) {
      // Mise à jour de la transaction existante
      await this.updateLinkedTransaction(list);
    } else {
      // Création d'une nouvelle transaction
      await this.budgetService.addTransaction({
        date: list.date,
        type: 'depense',
        categorie: 'course',
        montant: list.total,
        commentaire: detail
      });

      // Récupérer l'ID de la transaction créée (la plus récente de type course)
      const transactions = await this.budgetService.getTransactions();
      const matching = transactions
        .filter(t => t.type === 'depense' && t.categorie === 'course' && t.commentaire === detail)
        .sort((a, b) => b.date.localeCompare(a.date));

      list.validated = true;
      list.selfPaid = true;
      if (matching.length > 0) {
        list.transactionId = matching[0].id;
      }
    }

    const all = await this.getLocal();
    const index = all.findIndex(l => l.id === id);
    if (index !== -1) {
      all[index] = list;
      await this.saveLocal(all);
      await this.pushToFirestore(list);
    }
  }

  async validateWithoutExpense(id: string) {
    const list = await this.getCourseList(id);
    if (!list || list.articles.length === 0) return;

    // Si une transaction existait, la supprimer
    if (list.transactionId) {
      await this.budgetService.deleteTransaction(list.transactionId);
      list.transactionId = undefined;
    }

    list.validated = true;
    list.selfPaid = false;
    list.total = list.articles.reduce((sum, a) => sum + a.prix, 0);

    const all = await this.getLocal();
    const index = all.findIndex(l => l.id === id);
    if (index !== -1) {
      all[index] = list;
      await this.saveLocal(all);
      await this.pushToFirestore(list);
    }
  }

  private async updateLinkedTransaction(list: CourseList) {
    if (!list.transactionId) return;

    const detail = list.articles.map(a => `${a.intitule} (${a.prix.toFixed(0)}€)`).join(', ');

    // Supprimer l'ancienne transaction et en créer une nouvelle avec le même commentaire
    await this.budgetService.deleteTransaction(list.transactionId);
    await this.budgetService.addTransaction({
      date: list.date,
      type: 'depense',
      categorie: 'course',
      montant: list.total,
      commentaire: detail
    });

    // Mettre à jour le transactionId
    const transactions = await this.budgetService.getTransactions();
    const matching = transactions
      .filter(t => t.type === 'depense' && t.categorie === 'course' && t.commentaire === detail)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (matching.length > 0) {
      list.transactionId = matching[0].id;
    }
  }

  async deleteCourseList(id: string) {
    const list = await this.getCourseList(id);
    if (list?.validated && list.transactionId) {
      await this.budgetService.deleteTransaction(list.transactionId);
    }

    const all = await this.getLocal();
    const filtered = all.filter(l => l.id !== id);
    await this.saveLocal(filtered);
    this.deleteFromFirestore(id);
  }
}
