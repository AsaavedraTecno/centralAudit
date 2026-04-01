import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrendData } from '../../../../../../app/models/prediction';

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-trend-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trend-chart.html',
  styleUrl: './trend-chart.scss'
})
export class TrendChartComponent implements OnChanges, AfterViewInit, OnDestroy {

  @Input() trend: TrendData[] = [];

  @ViewChild('trendCanvas') canvas!: ElementRef<HTMLCanvasElement>;

  chart: Chart | null = null;

  ngAfterViewInit(): void {
    this.createChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['trend'] && !changes['trend'].isFirstChange()) {
      setTimeout(() => {
        this.createChart();
      }, 50);
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  createChart() {
    if (!this.canvas) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const dataSegura = this.trend || [];

    const labels = dataSegura.map(t => {
      const date = new Date(t.date);
      return date.toLocaleDateString();
    });

    const critical = dataSegura.map(t => t.critical);
    const warning = dataSegura.map(t => t.warning);
    const ok = dataSegura.map(t => t.ok);

    this.chart = new Chart(this.canvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Críticas',
            data: critical,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.2)',
            tension: 0.4
          },
          {
            label: 'Riesgo',
            data: warning,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.2)',
            tension: 0.4
          },
          {
            label: 'OK',
            data: ok,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.2)',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, 
        plugins: {
          legend: {
            position: 'bottom'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
}