import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { db } from './firebase.service';
import { AuthService } from './auth.service';
import { v4 as uuidv4 } from 'uuid';

export interface Transaction {
  id: string;
  userId: string;
  date: string;
  type: 'apport' | 'depense' | 'virement';
  categorie: string;
  montant: number;
  commentaire?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private readonly COLLECTION = 'transactions';
  private readonly STORAGE_KEY = 'transactions';

  syncDone: Promise<void> = Promise.resolve();

  constructor(private storage: Storage, private authService: AuthService) {
    this.init();
  }

  async init() {
    await this.storage.create();
  }

  // ── Local storage ──

  private async getLocal(): Promise<Transaction[]> {
    return (await this.storage.get(this.STORAGE_KEY)) || [];
  }

  private async saveLocal(transactions: Transaction[]) {
    await this.storage.set(this.STORAGE_KEY, transactions);
  }

  // ── Firestore ──

  private async pushToFirestore(transaction: Transaction) {
    try {
      await db.collection(this.COLLECTION).doc(transaction.id).set(transaction);
      console.log('Firestore: transaction envoyée', transaction.id);
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
      const remote: Transaction[] = snapshot.docs.map((d: any) => d.data() as Transaction);

      const local = await this.getLocal();

      // Merge: keep all unique transactions by id
      const merged = new Map<string, Transaction>();
      for (const t of remote) merged.set(t.id, t);
      for (const t of local) merged.set(t.id, t);

      const all = Array.from(merged.values());
      await this.saveLocal(all);

      // Push local-only transactions to Firestore
      const remoteIds = new Set(remote.map(t => t.id));
      const batch = db.batch();
      let batchCount = 0;
      for (const t of local) {
        if (!remoteIds.has(t.id) && t.userId === userId) {
          const ref = db.collection(this.COLLECTION).doc(t.id);
          batch.set(ref, t);
          batchCount++;
        }
      }
      if (batchCount > 0) await batch.commit();

      console.log(`Sync OK: ${all.length} transactions`);
    } catch (e) {
      console.warn('Sync failed (offline?), using local data', e);
    }
  }

  // ── Public API ──

  async getTransactions(): Promise<Transaction[]> {
    const all = await this.getLocal();
    if (this.authService.isAdmin()) {
      return all;
    }
    const userId = this.authService.getUserId();
    return all.filter(t => t.userId === userId);
  }

  async addTransaction(transaction: Omit<Transaction, 'id' | 'userId'>) {
    const userId = this.authService.getUserId();
    if (!userId) return;

    const newTransaction: Transaction = { id: uuidv4(), userId, ...transaction };
    const transactions = await this.getLocal();
    transactions.push(newTransaction);
    await this.saveLocal(transactions);
    await this.pushToFirestore(newTransaction);
  }

  async updateTransaction(id: string, changes: Partial<Pick<Transaction, 'montant' | 'commentaire' | 'categorie'>>) {
    const transactions = await this.getLocal();
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return;
    Object.assign(transactions[index], changes);
    await this.saveLocal(transactions);
    await this.pushToFirestore(transactions[index]);
  }

  async deleteTransaction(id: string) {
    const transactions = await this.getLocal();
    const filtered = transactions.filter(t => t.id !== id);
    await this.saveLocal(filtered);
    this.deleteFromFirestore(id);
  }

  async clearAll() {
    const transactions = await this.getLocal();
    await this.storage.remove(this.STORAGE_KEY);
    for (const t of transactions) {
      this.deleteFromFirestore(t.id);
    }
  }
}
