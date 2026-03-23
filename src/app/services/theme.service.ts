import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'darkMode';

  constructor(private storage: Storage) {
    this.init();
  }

  private async init() {
    await this.storage.create();
    const dark = await this.storage.get(this.STORAGE_KEY);
    this.applyTheme(dark ?? false);
  }

  async isDarkMode(): Promise<boolean> {
    return (await this.storage.get(this.STORAGE_KEY)) ?? false;
  }

  async setDarkMode(enabled: boolean) {
    await this.storage.set(this.STORAGE_KEY, enabled);
    this.applyTheme(enabled);
  }

  private applyTheme(dark: boolean) {
    document.body.classList.toggle('ion-palette-dark', dark);
  }
}
