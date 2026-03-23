import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import firebase from 'firebase/compat/app';
import { auth } from './firebase.service';

const ADMIN_EMAIL = 'root@budget.app';

@Injectable({ providedIn: 'root' })
export class AuthService {
  authState$: Observable<firebase.User | null>;

  constructor(private router: Router) {
    this.authState$ = new Observable(subscriber => {
      auth.onAuthStateChanged(user => subscriber.next(user));
    });
  }

  async login(email: string, password: string): Promise<void> {
    await auth.signInWithEmailAndPassword(email, password);
  }

  async register(email: string, password: string): Promise<void> {
    await auth.createUserWithEmailAndPassword(email, password);
  }

  async logout(): Promise<void> {
    await auth.signOut();
    this.router.navigateByUrl('/login');
  }

  getUserId(): string | null {
    return auth.currentUser?.uid ?? null;
  }

  isAdmin(): boolean {
    return auth.currentUser?.email === ADMIN_EMAIL;
  }
}
