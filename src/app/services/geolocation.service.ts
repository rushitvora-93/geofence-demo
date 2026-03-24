import { Injectable, OnDestroy, signal, computed } from '@angular/core';
import { LatLng } from '../models/geofence.model';

export type GeolocationState = 'idle' | 'watching' | 'error' | 'denied';

@Injectable({ providedIn: 'root' })
export class GeolocationService implements OnDestroy {
  // ── Public signals ────────────────────────────────────────────────────────
  readonly position = signal<LatLng | null>(null);
  readonly accuracy = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly state = signal<GeolocationState>('idle');

  readonly isWatching = computed(() => this.state() === 'watching');

  // ── Private ───────────────────────────────────────────────────────────────
  private watchId: number | null = null;

  startWatching(): void {
    if (!navigator.geolocation) {
      this.errorMessage.set('Geolocation API not supported in this browser.');
      this.state.set('error');
      return;
    }
    if (this.watchId !== null) return; // already watching

    this.state.set('watching');

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.position.set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        this.accuracy.set(pos.coords.accuracy);
        this.errorMessage.set(null);
      },
      (err) => {
        this.errorMessage.set(err.message);
        this.state.set(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
        this.watchId = null;
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10_000 },
    );
  }

  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.state.set('idle');
  }

  /** Manually inject a position (used for map-click simulation). */
  simulatePosition(pos: LatLng): void {
    this.position.set(pos);
    this.accuracy.set(0);
  }

  ngOnDestroy(): void {
    this.stopWatching();
  }
}
