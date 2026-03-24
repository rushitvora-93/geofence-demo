export type GeofenceStatus = 'inside' | 'outside' | 'unknown';
export type CrossDirection = 'entered' | 'exited';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeofenceConfig {
  center: LatLng;
  radiusMeters: number;
}

/** Fired each time the user crosses the geofence boundary. */
export interface GeofenceCrossEvent {
  direction: CrossDirection;
  position: LatLng;
  distanceMeters: number;
  timestamp: number;
}

/** Payload posted to the backend on boundary cross. */
export interface GeofenceEventPayload {
  event: CrossDirection;
  lat: number;
  lng: number;
  distanceMeters: number;
  geofenceLat: number;
  geofenceLng: number;
  geofenceRadiusMeters: number;
  timestamp: string; // ISO-8601
}
