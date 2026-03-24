import { Injectable } from '@angular/core';
import { GeofenceCrossEvent, GeofenceConfig, GeofenceEventPayload } from '../models/geofence.model';

const ENDPOINT = '/api/geofence-event'; // POST endpoint — swap for real URL

@Injectable({ providedIn: 'root' })
export class ApiService {
  /**
   * Called on every boundary cross.
   *
   * Integration note:
   *   Real backend → replace console.log with:
   *     this.http.post<void>(ENDPOINT, payload).subscribe()
   *
   *   Payload shape matches GeofenceEventPayload so the backend can:
   *     • Store event in DB (event + coords + radius + timestamp)
   *     • Trigger push notification / webhook
   *     • Feed a real-time dashboard via SSE/WebSocket
   */
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

    // 🔔 Mock API call — in production replace with HttpClient.post()
    console.group(`%c[Geofence API] POST ${ENDPOINT}`, 'color: #6366f1; font-weight: bold');
    console.log('Payload:', payload);
    console.groupEnd();

    /*
     * ── Backend integration (uncomment & inject HttpClient) ───────────────
     *
     * this.http
     *   .post<{ id: string }>(ENDPOINT, payload)
     *   .pipe(
     *     retry({ count: 2, delay: 1000 }),
     *     catchError((err) => {
     *       console.error('[Geofence API] Failed to report crossing:', err);
     *       return EMPTY;
     *     }),
     *   )
     *   .subscribe((res) => console.log('[Geofence API] Acknowledged:', res.id));
     */
  }
}
