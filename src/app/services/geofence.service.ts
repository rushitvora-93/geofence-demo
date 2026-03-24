import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  GeofenceConfig,
  GeofenceCrossEvent,
  GeofenceStatus,
  LatLng,
} from '../models/geofence.model';
import { GeolocationService } from './geolocation.service';
import { ApiService } from './api.service';

/** Equatorial radius of Earth in metres. */
const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine great-circle distance in metres. */
function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const chord =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(chord));
}

@Injectable({ providedIn: 'root' })
export class GeofenceService {
  private readonly geo = inject(GeolocationService);
  private readonly api = inject(ApiService);

  // ── Configurable geofence ─────────────────────────────────────────────────
  readonly config = signal<GeofenceConfig>({
    center: { lat: 51.505, lng: -0.09 }, // London default
    radiusMeters: 500,
  });

  // ── Derived / reactive state ──────────────────────────────────────────────
  readonly distanceMeters = computed<number | null>(() => {
    const pos = this.geo.position();
    if (!pos) return null;
    return haversineMeters(pos, this.config().center);
  });

  readonly status = computed<GeofenceStatus>(() => {
    const dist = this.distanceMeters();
    if (dist === null) return 'unknown';
    return dist <= this.config().radiusMeters ? 'inside' : 'outside';
  });

  readonly lastEvent = signal<GeofenceCrossEvent | null>(null);
  readonly eventHistory = signal<GeofenceCrossEvent[]>([]);

  // ── Boundary-cross detection ──────────────────────────────────────────────
  /** Tracks the status from the previous evaluation cycle. */
  private prevStatus: GeofenceStatus = 'unknown';

  constructor() {
    // effect() runs in the signal graph — no NgZone needed.
    effect(() => {
      const current = this.status();
      const pos = this.geo.position();

      if (!pos || current === 'unknown') {
        this.prevStatus = 'unknown';
        return;
      }

      const crossed =
        this.prevStatus !== 'unknown' && current !== this.prevStatus;

      if (crossed) {
        const event: GeofenceCrossEvent = {
          direction: current === 'inside' ? 'entered' : 'exited',
          position: { ...pos },
          distanceMeters: this.distanceMeters()!,
          timestamp: Date.now(),
        };

        this.lastEvent.set(event);
        this.eventHistory.update((h) => [event, ...h].slice(0, 20));
        this.api.reportCrossing(event, this.config());
      }

      this.prevStatus = current;
    });
  }

  updateCenter(center: LatLng): void {
    this.config.update((c) => ({ ...c, center }));
  }

  updateRadius(radiusMeters: number): void {
    this.config.update((c) => ({ ...c, radiusMeters }));
  }
}
