import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeofenceService } from '../../services/geofence.service';
import { GeolocationService } from '../../services/geolocation.service';

@Component({
  selector: 'app-status-panel',
  standalone: true,
  imports: [FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-panel.component.html',
  styleUrl: './status-panel.component.scss',
})
export class StatusPanelComponent {
  readonly geofence = inject(GeofenceService);
  readonly geo = inject(GeolocationService);

  // ── Local form signals (no FormGroup needed — signals-first) ──────────────
  readonly formLat = signal('51.505');
  readonly formLng = signal('-0.09');
  readonly formRadius = signal('500');

  // ── Derived display values ─────────────────────────────────────────────────
  readonly statusLabel = computed(() => {
    const s = this.geofence.status();
    return s === 'inside' ? '✅ Inside' : s === 'outside' ? '🔴 Outside' : '⏳ Unknown';
  });

  readonly statusClass = computed(() => this.geofence.status());

  readonly distanceDisplay = computed(() => {
    const d = this.geofence.distanceMeters();
    return d !== null ? `${d.toFixed(0)} m` : '—';
  });

  readonly posDisplay = computed(() => {
    const p = this.geo.position();
    return p ? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` : '—';
  });

  readonly accuracyDisplay = computed(() => {
    const a = this.geo.accuracy();
    return a !== null ? `±${a.toFixed(0)} m` : '';
  });

  readonly lastEventDisplay = computed(() => {
    const e = this.geofence.lastEvent();
    if (!e) return null;
    return {
      direction: e.direction === 'entered' ? '➡️ Entered' : '⬅️ Exited',
      time: new Date(e.timestamp).toLocaleTimeString(),
      dist: `${e.distanceMeters.toFixed(0)} m from center`,
    };
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  applyConfig(): void {
    const lat = parseFloat(this.formLat());
    const lng = parseFloat(this.formLng());
    const radius = parseFloat(this.formRadius());

    if (isNaN(lat) || isNaN(lng) || isNaN(radius) || radius <= 0) return;

    this.geofence.updateCenter({ lat, lng });
    this.geofence.updateRadius(radius);
  }

  startGps(): void {
    this.geo.startWatching();
  }

  stopGps(): void {
    this.geo.stopWatching();
  }
}
