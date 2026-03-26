import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { BudgetService, Transaction } from '../services/budget.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const CHART_COLORS = [
  '#4dc9f6', '#f67019', '#f53794', '#537bc4',
  '#acc236', '#166a8f', '#00a950', '#58595b',
  '#8549ba', '#e6194b', '#3cb44b', '#ffe119'
];

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, AfterViewInit {
  @ViewChild('barChart') barChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('doughnutChart') doughnutChartRef!: ElementRef<HTMLCanvasElement>;

  transactions: Transaction[] = [];
  recentTransactions: Transaction[] = [];
  soldeTotal = 0;
  soldeEpargne = 0;
  soldeDeblock = 0;
  patrimoineTotal = 0;
  loading = true;

  // Résumé du mois
  monthRevenus = 0;
  monthDepenses = 0;
  monthBalance = 0;
  revenusPercent = 0;
  depensesPercent = 0;
  currentMonthLabel = '';

  // Catégories
  categoryData: { label: string; montant: number; color: string }[] = [];

  private barChart?: Chart;
  private doughnutChart?: Chart;
  private viewReady = false;

  constructor(private budgetService: BudgetService, private alertController: AlertController) {}

  async ngOnInit() {
    await this.loadData();
  }

  ngAfterViewInit() {
    this.viewReady = true;
    if (!this.loading) {
      this.buildCharts();
    }
  }

  async ionViewWillEnter() {
    await this.loadData();
  }

  async loadData() {
    this.loading = true;
    await this.budgetService.syncDone;
    this.transactions = (await this.budgetService.getTransactions())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    this.recentTransactions = this.transactions.slice(0, 10);
    this.calculerSoldes();
    this.calculerResumeMois();
    this.calculerCategories();
    this.loading = false;

    if (this.viewReady) {
      setTimeout(() => this.buildCharts(), 50);
    }
  }

  calculerSoldes() {
    let total = 0;
    let epargne = 0;
    let deblock = 0;

    for (let t of this.transactions) {
      if (t.type === 'apport') {
        if (t.categorie === 'epargne-apport') {
          epargne += t.montant;
        } else if (t.categorie === 'deblock-apport') {
          deblock += t.montant;
        } else {
          total += t.montant;
        }
      } else if (t.type === 'depense') {
        total -= t.montant;
      } else if (t.type === 'virement') {
        if (t.categorie === 'epargne+') {
          total -= t.montant;
          epargne += t.montant;
        } else if (t.categorie === 'epargne-') {
          total += t.montant;
          epargne -= t.montant;
        } else if (t.categorie === 'deblock+') {
          total -= t.montant;
          deblock += t.montant;
        } else if (t.categorie === 'deblock-courant') {
          total += t.montant;
          deblock -= t.montant;
        } else if (t.categorie === 'deblock-epargne') {
          epargne -= t.montant;
          deblock += t.montant;
        } else if (t.categorie === 'deblock-depense') {
          deblock -= t.montant;
        }
      }
    }

    this.soldeTotal = total;
    this.soldeEpargne = epargne;
    this.soldeDeblock = deblock;
    this.patrimoineTotal = total + epargne + deblock;
  }

  calculerResumeMois() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    this.currentMonthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    this.currentMonthLabel = this.currentMonthLabel.charAt(0).toUpperCase() + this.currentMonthLabel.slice(1);

    let revenus = 0;
    let depenses = 0;

    for (const t of this.transactions) {
      const d = new Date(t.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        if (t.type === 'apport' && t.categorie !== 'epargne-apport' && t.categorie !== 'deblock-apport') {
          revenus += t.montant;
        } else if (t.type === 'depense') {
          depenses += t.montant;
        }
      }
    }

    this.monthRevenus = revenus;
    this.monthDepenses = depenses;
    this.monthBalance = revenus - depenses;

    const max = Math.max(revenus, depenses, 1);
    this.revenusPercent = (revenus / max) * 100;
    this.depensesPercent = (depenses / max) * 100;
  }

  calculerCategories() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const catMap = new Map<string, number>();

    for (const t of this.transactions) {
      const d = new Date(t.date);
      if (d.getFullYear() === year && d.getMonth() === month && t.type === 'depense') {
        const label = this.getOperationLabel(t);
        catMap.set(label, (catMap.get(label) || 0) + t.montant);
      }
    }

    this.categoryData = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, montant], i) => ({
        label,
        montant,
        color: CHART_COLORS[i % CHART_COLORS.length]
      }));
  }

  private buildCharts() {
    this.buildBarChart();
    this.buildDoughnutChart();
  }

  private buildBarChart() {
    if (!this.barChartRef?.nativeElement) return;
    if (this.barChart) this.barChart.destroy();

    const now = new Date();
    const labels: string[] = [];
    const revenusData: number[] = [];
    const depensesData: number[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleDateString('fr-FR', { month: 'short' }));

      let rev = 0, dep = 0;
      for (const t of this.transactions) {
        const td = new Date(t.date);
        if (td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth()) {
          if (t.type === 'apport' && t.categorie !== 'epargne-apport' && t.categorie !== 'deblock-apport') {
            rev += t.montant;
          } else if (t.type === 'depense') {
            dep += t.montant;
          }
        }
      }
      revenusData.push(rev);
      depensesData.push(dep);
    }

    const isDark = document.documentElement.classList.contains('ion-palette-dark');
    const textColor = isDark ? '#e0e0e0' : '#666';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    this.barChart = new Chart(this.barChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenus',
            data: revenusData,
            backgroundColor: 'rgba(45, 211, 111, 0.7)',
            borderRadius: 4,
          },
          {
            label: 'Dépenses',
            data: depensesData,
            backgroundColor: 'rgba(235, 68, 90, 0.7)',
            borderRadius: 4,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, padding: 16, usePointStyle: true, pointStyle: 'circle' }
          }
        },
        scales: {
          x: { ticks: { color: textColor }, grid: { display: false } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }

  private buildDoughnutChart() {
    if (!this.doughnutChartRef?.nativeElement) return;
    if (this.doughnutChart) this.doughnutChart.destroy();
    if (this.categoryData.length === 0) return;

    const isDark = document.documentElement.classList.contains('ion-palette-dark');
    const textColor = isDark ? '#e0e0e0' : '#666';

    this.doughnutChart = new Chart(this.doughnutChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.categoryData.map(c => c.label),
        datasets: [{
          data: this.categoryData.map(c => c.montant),
          backgroundColor: this.categoryData.map(c => c.color),
          borderWidth: 2,
          borderColor: isDark ? '#1e1e1e' : '#ffffff',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed;
                return ` ${ctx.label}: XPF ${val.toLocaleString()}`;
              }
            }
          }
        }
      }
    });
  }

  getOperationLabel(t: Transaction): string {
    if (t.categorie === 'charge-fixe') return 'Charge fixe';
    if (t.categorie === 'ressource-fixe') return 'Ressource fixe';
    return t.categorie.charAt(0).toUpperCase() + t.categorie.slice(1);
  }

  getDescription(t: Transaction): string {
    if (t.categorie === 'course') {
      const d = new Date(t.date);
      const jj = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const aa = String(d.getFullYear()).slice(-2);
      return `Course du ${jj}/${mm}/${aa}`;
    }
    return t.commentaire || '';
  }

  async editMontant(t: Transaction) {
    const alert = await this.alertController.create({
      header: 'Modifier le montant',
      inputs: [{ name: 'montant', type: 'number', value: t.montant, placeholder: 'Montant' }],
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Valider',
          handler: async (data) => {
            const montant = parseFloat(data.montant);
            if (!montant || montant <= 0) return;
            await this.budgetService.updateTransaction(t.id, { montant });
            await this.loadData();
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteTransaction(id: string) {
    await this.budgetService.deleteTransaction(id);
    await this.loadData();
  }
}
