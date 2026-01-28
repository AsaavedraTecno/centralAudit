import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClienteTreeComponent } from '../cliente-tree/cliente-tree';

@Component({
  selector: 'app-panel',
  standalone: true,
  // Ya no importamos componentes hijos aquí, solo RouterModule y CommonModule
  imports: [CommonModule, ClienteTreeComponent],
  templateUrl: './panel.html',
  styleUrls: ['./panel.scss']
})
export class PanelComponent {

}