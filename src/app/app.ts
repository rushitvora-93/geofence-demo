import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MapComponent } from './components/map/map.component';
import { StatusPanelComponent } from './components/status-panel/status-panel.component';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MapComponent, StatusPanelComponent],
  template: `
    <div class="layout">
      <app-status-panel />
      <app-map />
    </div>
  `,
  styles: [`
    :host { display: block; }
    .layout {
      display: flex;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: #0f172a;
    }
  `],
})
export class App {}
