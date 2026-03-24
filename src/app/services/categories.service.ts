import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { db } from './firebase.service';
import { AuthService } from './auth.service';
import { BudgetService } from './budget.service';

export interface UserCategories {
  depense: string[];
  apport: string[];
}

const DEFAULT_CATEGORIES: UserCategories = {
  depense: ['course', 'loyer', 'transport', 'loisirs', 'autre', 'transfert-epargne', 'transfert-deblock'],
  apport: ['salaire', 'prime', 'remboursement', 'divers']
};

export const PROTECTED_CATEGORIES = ['transfert-epargne', 'transfert-deblock'];

@Injectable({
  providedIn: 'root'
})
export class CategoriesService {
  private readonly COLLECTION = 'userCategories';
  private readonly STORAGE_KEY = 'userCategories';

  constructor(private storage: Storage, private authService: AuthService, private budgetService: BudgetService) {
    this.init();
  }

  async init() {
    await this.storage.create();
  }

  private async getLocal(): Promise<UserCategories | null> {
    return await this.storage.get(this.STORAGE_KEY);
  }

  private async saveLocal(categories: UserCategories) {
    await this.storage.set(this.STORAGE_KEY, categories);
  }

  async syncFromFirestore() {
    try {
      const userId = this.authService.getUserId();
      if (!userId) return;

      const doc = await db.collection(this.COLLECTION).doc(userId).get();
      if (doc.exists) {
        const remote = doc.data() as UserCategories;
        await this.saveLocal(remote);
      } else {
        // Pas de catégories en remote, pousser les locales ou les défauts
        const local = await this.getLocal();
        const toSave = local || DEFAULT_CATEGORIES;
        await this.saveLocal(toSave);
        await db.collection(this.COLLECTION).doc(userId).set(toSave);
      }
    } catch (e) {
      console.warn('Sync categories failed (offline?)', e);
    }
  }

  async getCategories(): Promise<UserCategories> {
    const local = await this.getLocal();
    if (!local) return { depense: [...DEFAULT_CATEGORIES.depense], apport: [...DEFAULT_CATEGORIES.apport] };

    // Ensure protected categories exist for existing users
    let changed = false;
    for (const cat of PROTECTED_CATEGORIES) {
      if (!local.depense.includes(cat)) {
        local.depense.push(cat);
        changed = true;
      }
    }
    if (changed) {
      await this.saveCategories(local);
    }
    return local;
  }

  async saveCategories(categories: UserCategories) {
    await this.saveLocal(categories);

    const userId = this.authService.getUserId();
    if (userId) {
      try {
        await db.collection(this.COLLECTION).doc(userId).set(categories);
      } catch (e) {
        console.warn('Firestore save categories failed', e);
      }
    }
  }

  async addCategory(type: 'depense' | 'apport', name: string) {
    const categories = await this.getCategories();
    const normalized = name.trim().toLowerCase();
    if (!normalized || categories[type].includes(normalized)) return;
    categories[type].push(normalized);
    await this.saveCategories(categories);
  }

  async renameCategory(type: 'depense' | 'apport', oldName: string, newName: string) {
    if (PROTECTED_CATEGORIES.includes(oldName)) return;
    const normalized = newName.trim().toLowerCase();
    if (!normalized || normalized === oldName) return;

    const categories = await this.getCategories();
    const index = categories[type].indexOf(oldName);
    if (index === -1) return;
    if (categories[type].includes(normalized)) return;

    categories[type][index] = normalized;
    await this.saveCategories(categories);

    // Update all transactions with the old category name
    const transactions = await this.budgetService.getTransactions();
    for (const t of transactions) {
      if (t.categorie === oldName && t.type === type) {
        await this.budgetService.updateTransaction(t.id, { categorie: normalized });
      }
    }
  }

  async removeCategory(type: 'depense' | 'apport', name: string) {
    if (PROTECTED_CATEGORIES.includes(name)) return;
    const categories = await this.getCategories();
    categories[type] = categories[type].filter(c => c !== name);
    await this.saveCategories(categories);
  }
}
