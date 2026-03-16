import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrendData } from '../../../../../../app/core/services/predictions/prediction.service';


import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-trend-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trend-chart.html',
  styleUrl: './trend-chart.scss'
})
export class TrendChartComponent implements OnChanges {

  @Input() trend: TrendData[] = [];

  @ViewChild('trendCanvas') canvas!: ElementRef<HTMLCanvasElement>;

  chart: Chart | null = null;

  ngOnChanges(changes: SimpleChanges): void {

    if (changes['trend'] && this.trend?.length) {
      setTimeout(() => {
        this.createChart();
      });
    }

  }

  createChart() {

    if (!this.canvas) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const labels = this.trend.map(t => {
      const date = new Date(t.date);
      return date.toLocaleDateString();
    });

    const critical = this.trend.map(t => t.critical);
    const warning = this.trend.map(t => t.warning);
    const ok = this.trend.map(t => t.ok);

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