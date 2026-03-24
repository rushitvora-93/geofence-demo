import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, catchError, retry } from 'rxjs';
import { GeofenceCrossEvent, GeofenceConfig, GeofenceEventPayload } from '../models/geofence.model';

export interface Asset {
  id: number;
  name: string;
  username: string;
  email: string;
  company: string;
  position: { lat: number; lng: number };
  status: 'inside' | 'outside';
  lastSeen: string;
}

export interface AssetsResponse {
  assets: Asset[];
  count: number;
  source: string;
}

export interface GeofenceEventsResponse {
  events: (GeofenceEventPayload & { id: string; receivedAt: string })[];
  count: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  /** Fetch tracked assets from the Node.js backend (sourced from JSONPlaceholder). */
  getAssets() {
    return this.http.get<AssetsResponse>('/api/assets').pipe(
      retry({ count: 2, delay: 1000 }),
      catchError((err) => {
        console.error('[Geofence API] Failed to load assets:', err);
        return EMPTY;
      }),
    );
  }

  /** Fetch all stored crossing events from the backend. */
  getCrossingEvents() {
    return this.http.get<GeofenceEventsResponse>('/api/geofence-events').pipe(
      catchError((err) => {
        console.error('[Geofence API] Failed to load events:', err);
        return EMPTY;
      }),
    );
  }

  /** Called on every boundary cross — POSTs to the Node.js backend. */
  reportCrossing(event: GeofenceCrossEvent, config: GeofenceConfig): void {
    const payload: GeofenceEventPayload = {
      event: event.direction,
      lat: event.position.lat,
      lng: event.position.lng,
      distanceMeters: Math.round(event.distanceMeters),
      geofenceLat: config.center.lat,
      geofenceLng: config.center.lng,
      geofenceRadiusMeters: config.radiusMeters,
      timestamp: new Date(event.timestamp).toISOString(),
    };

    this.http
      .post<{ id: string; acknowledged: boolean }>('/api/geofence-event', payload)
      .pipe(
        retry({ count: 2, delay: 1000 }),
        catchError((err) => {
          console.error('[Geofence API] Failed to report crossing:', err);
          return EMPTY;
        }),
      )
      .subscribe((res) => {
        console.log(`[Geofence API] Crossing acknowledged — id: ${res.id}`);
      });
  }
}
