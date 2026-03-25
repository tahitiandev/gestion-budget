import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { db } from './firebase.service';
import { AuthService } from './auth.service';
import { BudgetService } from './budget.service';
import { v4 as uuidv4 } from 'uuid';

export interface UserCategories {
  depense: string[];
  apport: string[];
}

export interface DefaultOperation {
  type: 'apport' | 'depense';
  categorieApport: string;
  categorieDepense: string;
}

export interface FixedCharge {
  id: string;
  intitule: string;
  montant: number;
}

const DEFAULT_FIXED_CHARGES: FixedCharge[] = [
  { id: '1', intitule: 'Loyer', montant: 0 },
  { id: '2', intitule: 'Électricité', montant: 0 },
  { id: '3', intitule: 'Internet', montant: 0 },
  { id: '4', intitule: 'Téléphone', montant: 0 },
];

const DEFAULT_FIXED_RESOURCES: FixedCharge[] = [
  { id: '1', intitule: 'Salaire', montant: 0 },
];

const DEFAULT_CATEGORIES: UserCategories = {
  depense: ['course', 'loyer', 'transport', 'loisirs', 'autre', 'transfert-epargne', 'transfert-deblock'],
  apport: ['prime', 'remboursement', 'divers', 'transfert-epargne-cc', 'transfert-deblock-cc']
};

export const PROTECTED_CATEGORIES = ['transfert-epargne', 'transfert-deblock', 'transfert-epargne-cc', 'transfert-deblock-cc'];

@Injectable({
  providedIn: 'root'
})
export class CategoriesService {
  private readonly COLLECTION = 'userCategories';
  private readonly STORAGE_KEY = 'userCategories';
  private readonly DEFAULTS_KEY = 'defaultOperation';
  private readonly FIXED_CHARGES_KEY = 'fixedCharges';
  private readonly FIXED_CHARGES_COLLECTION = 'fixedCharges';
  private readonly FIXED_RESOURCES_KEY = 'fixedResources';
  private readonly FIXED_RESOURCES_COLLECTION = 'fixedResources';

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
    const depenseProtected = ['transfert-epargne', 'transfert-deblock'];
    const apportProtected = ['transfert-epargne-cc', 'transfert-deblock-cc'];
    for (const cat of depenseProtected) {
      if (!local.depense.includes(cat)) {
        local.depense.push(cat);
        changed = true;
      }
    }
    for (const cat of apportProtected) {
      if (!local.apport.includes(cat)) {
        local.apport.push(cat);
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

  async getDefaultOperation(): Promise<DefaultOperation> {
    const saved = await this.storage.get(this.DEFAULTS_KEY);
    return saved || { type: 'depense', categorieApport: '', categorieDepense: '' };
  }

  async saveDefaultOperation(defaults: DefaultOperation) {
    await this.storage.set(this.DEFAULTS_KEY, defaults);
  }

  async removeCategory(type: 'depense' | 'apport', name: string) {
    if (PROTECTED_CATEGORIES.includes(name)) return;
    const categories = await this.getCategories();
    categories[type] = categories[type].filter(c => c !== name);
    await this.saveCategories(categories);
  }

  // ── Charges fixes ──

  async getFixedCharges(): Promise<FixedCharge[]> {
    const local = await this.storage.get(this.FIXED_CHARGES_KEY);
    return local || [...DEFAULT_FIXED_CHARGES];
  }

  async saveFixedCharges(charges: FixedCharge[]) {
    await this.storage.set(this.FIXED_CHARGES_KEY, charges);
    const userId = this.authService.getUserId();
    if (userId) {
      try {
        await db.collection(this.FIXED_CHARGES_COLLECTION).doc(userId).set({ charges });
      } catch (e) {
        console.warn('Firestore save fixed charges failed', e);
      }
    }
  }

  async addFixedCharge(intitule: string, montant: number) {
    const charges = await this.getFixedCharges();
    charges.push({ id: uuidv4(), intitule: intitule.trim(), montant });
    await this.saveFixedCharges(charges);
  }

  async updateFixedCharge(id: string, changes: Partial<Pick<FixedCharge, 'intitule' | 'montant'>>) {
    const charges = await this.getFixedCharges();
    const index = charges.findIndex(c => c.id === id);
    if (index === -1) return;
    Object.assign(charges[index], changes);
    await this.saveFixedCharges(charges);
  }

  async removeFixedCharge(id: string) {
    const charges = await this.getFixedCharges();
    const filtered = charges.filter(c => c.id !== id);
    await this.saveFixedCharges(filtered);
  }

  async syncFixedChargesFromFirestore() {
    try {
      const userId = this.authService.getUserId();
      if (!userId) return;

      const doc = await db.collection(this.FIXED_CHARGES_COLLECTION).doc(userId).get();
      if (doc.exists) {
        const remote = doc.data() as { charges: FixedCharge[] };
        await this.storage.set(this.FIXED_CHARGES_KEY, remote.charges);
      } else {
        const local = await this.storage.get(this.FIXED_CHARGES_KEY);
        const toSave = local || [...DEFAULT_FIXED_CHARGES];
        await this.storage.set(this.FIXED_CHARGES_KEY, toSave);
        await db.collection(this.FIXED_CHARGES_COLLECTION).doc(userId).set({ charges: toSave });
      }
    } catch (e) {
      console.warn('Sync fixed charges failed (offline?)', e);
    }
  }

  // ── Ressources fixes ──

  async getFixedResources(): Promise<FixedCharge[]> {
    const local = await this.storage.get(this.FIXED_RESOURCES_KEY);
    return local || [...DEFAULT_FIXED_RESOURCES];
  }

  async saveFixedResources(resources: FixedCharge[]) {
    await this.storage.set(this.FIXED_RESOURCES_KEY, resources);
    const userId = this.authService.getUserId();
    if (userId) {
      try {
        await db.collection(this.FIXED_RESOURCES_COLLECTION).doc(userId).set({ resources });
      } catch (e) {
        console.warn('Firestore save fixed resources failed', e);
      }
    }
  }

  async addFixedResource(intitule: string, montant: number) {
    const resources = await this.getFixedResources();
    resources.push({ id: uuidv4(), intitule: intitule.trim(), montant });
    await this.saveFixedResources(resources);
  }

  async updateFixedResource(id: string, changes: Partial<Pick<FixedCharge, 'intitule' | 'montant'>>) {
    const resources = await this.getFixedResources();
    const index = resources.findIndex(r => r.id === id);
    if (index === -1) return;
    Object.assign(resources[index], changes);
    await this.saveFixedResources(resources);
  }

  async removeFixedResource(id: string) {
    const resources = await this.getFixedResources();
    const filtered = resources.filter(r => r.id !== id);
    await this.saveFixedResources(filtered);
  }

  async syncFixedResourcesFromFirestore() {
    try {
      const userId = this.authService.getUserId();
      if (!userId) return;

      const doc = await db.collection(this.FIXED_RESOURCES_COLLECTION).doc(userId).get();
      if (doc.exists) {
        const remote = doc.data() as { resources: FixedCharge[] };
        await this.storage.set(this.FIXED_RESOURCES_KEY, remote.resources);
      } else {
        const local = await this.storage.get(this.FIXED_RESOURCES_KEY);
        const toSave = local || [...DEFAULT_FIXED_RESOURCES];
        await this.storage.set(this.FIXED_RESOURCES_KEY, toSave);
        await db.collection(this.FIXED_RESOURCES_COLLECTION).doc(userId).set({ resources: toSave });
      }
    } catch (e) {
      console.warn('Sync fixed resources failed (offline?)', e);
    }
  }
}
