# Geofence Demo — Angular 21 · Zoneless · Signals-First

A production-ready geofence demo built with Angular 21's **zoneless change detection** and the **Signals API** throughout. No `zone.js`. No RxJS observables in state management.

## Quick Start

```bash
npm install
npm start   # → http://localhost:4200
```

- **Click the map** to simulate your position (desktop-friendly).
- **Start GPS** to use `navigator.geolocation.watchPosition`.
- **Drag the pin** or fill in the config form to move the geofence.
- Open DevTools console — boundary crosses log a `POST /geofence-event` payload.

---

## Architecture

```
src/app/
├── models/geofence.model.ts          # Pure TS interfaces — no Angular deps
├── services/
│   ├── geolocation.service.ts        # navigator.geolocation → signals
│   ├── geofence.service.ts           # haversine math + cross-event via effect()
│   └── api.service.ts                # mock POST /geofence-event (console.log)
└── components/
    ├── map/                          # Leaflet, afterNextRender, reactive effects
    └── status-panel/                 # Signals-driven form + live status
```

---

## Angular 21 Patterns Used

### 1. Zoneless bootstrap
```ts
// app.config.ts
providers: [
  provideZonelessChangeDetection(), // no zone.js, signals drive CD
  provideHttpClient(),
]
```

### 2. Signal-based service state
```ts
readonly position   = signal<LatLng | null>(null);
readonly state      = signal<GeolocationState>('idle');
readonly isWatching = computed(() => this.state() === 'watching');
```

### 3. Derived geofence status via `computed()`
```ts
readonly distanceMeters = computed(() => {
  const pos = this.geo.position();
  return pos ? haversineMeters(pos, this.config().center) : null;
});

readonly status = computed<GeofenceStatus>(() => {
  const d = this.distanceMeters();
  return d === null ? 'unknown' : d <= this.config().radiusMeters ? 'inside' : 'outside';
});
```

### 4. Boundary-cross detection with `effect()`
```ts
effect(() => {
  const current = this.status(); // auto-tracked dependency
  if (crossed) {
    this.lastEvent.set(event);
    this.api.reportCrossing(event, this.config());
  }
});
```

### 5. `afterNextRender()` for Leaflet DOM init
```ts
afterNextRender(() => this.initMap()); // safe DOM access, no NgZone needed
```

### 6. Signals-first form (no `FormGroup`)
```ts
readonly formLat    = signal('51.505');
readonly formRadius = signal('500');
```
```html
<input [ngModel]="formLat()" (ngModelChange)="formLat.set($event)" />
```

---

## Backend Integration — `POST /geofence-event`

Every boundary cross calls `ApiService.reportCrossing()`. The payload shape:

```json
{
  "event": "entered",
  "lat": 51.50612,
  "lng": -0.08943,
  "distanceMeters": 497,
  "geofenceLat": 51.505,
  "geofenceLng": -0.09,
  "geofenceRadiusMeters": 500,
  "timestamp": "2026-03-23T18:31:04.000Z"
}
```

To wire a real backend, replace the `console.log` in `api.service.ts` with:

```ts
constructor(private http: HttpClient) {}

this.http
  .post<{ id: string }>('/api/geofence-event', payload)
  .pipe(retry({ count: 2, delay: 1000 }), catchError(() => EMPTY))
  .subscribe();
```

### Backend recommendations

| Concern | Approach |
|---|---|
| Persistence | Store `(user_id, direction, lat, lng, radius_m, timestamp)` |
| Real-time | WebSocket / SSE push after INSERT for live dashboards |
| Push alerts | Fire FCM/APNS on `entered` events |
| Deduplication | Reject same-direction events within 30 s per user |
| Auth | Send `Authorization: Bearer <jwt>`, validate server-side |
