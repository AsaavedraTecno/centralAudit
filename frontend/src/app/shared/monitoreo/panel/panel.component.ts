import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClienteTreeComponent } from '../cliente-tree/cliente-tree';

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [CommonModule, ClienteTreeComponent],
  templateUrl: './panel.html',
  styleUrls: ['./panel.scss']
})
export class PanelComponent {

}