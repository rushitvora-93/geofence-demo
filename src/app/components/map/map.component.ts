import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  afterNextRender,
  computed,
  effect,
  inject,
} from '@angular/core';
import * as L from 'leaflet';
import { GeofenceService } from '../../services/geofence.service';
import { GeolocationService } from '../../services/geolocation.service';

// Fix Leaflet default marker icon paths when bundled with Angular
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

@Component({
  selector: 'app-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="map-wrapper">
      <div #mapEl id="leaflet-map"></div>
      <div class="map-hint">
        <span>📍 Click the map to simulate your position</span>
      </div>
    </div>
  `,
  styleUrl: './map.component.scss',
})
export class MapComponent implements OnDestroy {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  private readonly geofence = inject(GeofenceService);
  private readonly geo = inject(GeolocationService);

  private map!: L.Map;
  private geofenceCircle!: L.Circle;
  private centerMarker!: L.Marker;
  private userMarker!: L.CircleMarker;

  // ── Computed helpers used in effects ──────────────────────────────────────
  private readonly config = computed(() => this.geofence.config());
  private readonly userPos = computed(() => this.geo.position());
  private readonly fenceStatus = computed(() => this.geofence.status());

  constructor() {
    // afterNextRender: runs once after the first render cycle, safe for DOM ops.
    afterNextRender(() => this.initMap());

    // Reactive effect: re-draw geofence whenever config changes.
    effect(() => {
      if (!this.map) return;
      const { center, radiusMeters } = this.config();

      this.centerMarker.setLatLng([center.lat, center.lng]);
      this.geofenceCircle.setLatLng([center.lat, center.lng]);
      this.geofenceCircle.setRadius(radiusMeters);
    });

    // Reactive effect: move user marker when position updates.
    effect(() => {
      if (!this.map) return;
      const pos = this.userPos();
      const status = this.fenceStatus();

      if (!pos) return;

      const latlng: L.LatLngExpression = [pos.lat, pos.lng];
      this.userMarker.setLatLng(latlng);
      this.userMarker.setStyle({
        color: status === 'inside' ? '#22c55e' : '#ef4444',
        fillColor: status === 'inside' ? '#86efac' : '#fca5a5',
      });

      if (!this.map.getBounds().contains(latlng)) {
        this.map.panTo(latlng);
      }
    });
  }

  private initMap(): void {
    const { center, radiusMeters } = this.config();

    // ── Base map ──────────────────────────────────────────────────────────
    this.map = L.map(this.mapEl.nativeElement, {
      center: [center.lat, center.lng],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    // ── Geofence circle ───────────────────────────────────────────────────
    this.geofenceCircle = L.circle([center.lat, center.lng], {
      radius: radiusMeters,
      color: '#6366f1',
      fillColor: '#818cf8',
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '6 4',
    }).addTo(this.map);

    // ── Geofence center pin ───────────────────────────────────────────────
    this.centerMarker = L.marker([center.lat, center.lng], {
      title: 'Geofence Center',
      draggable: true,
    })
      .addTo(this.map)
      .bindPopup('Geofence center — drag to move');

    // Dragging the center pin updates the signal.
    this.centerMarker.on('dragend', () => {
      const latlng = this.centerMarker.getLatLng();
      this.geofence.updateCenter({ lat: latlng.lat, lng: latlng.lng });
    });

    // ── User position marker ──────────────────────────────────────────────
    this.userMarker = L.circleMarker([center.lat, center.lng], {
      radius: 10,
      color: '#94a3b8',
      fillColor: '#cbd5e1',
      fillOpacity: 0.9,
      weight: 2,
    })
      .addTo(this.map)
      .bindPopup('Your simulated position');

    // ── Map click → simulate position ─────────────────────────────────────
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.geo.simulatePosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
