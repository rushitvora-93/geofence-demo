/**
 * Geofence Demo — Node.js Backend
 *
 * Endpoints:
 *   GET  /api/assets          Dummy tracked assets fetched from JSONPlaceholder
 *   POST /api/geofence-event  Receive & store a boundary-crossing event
 *   GET  /api/geofence-events List all stored crossing events
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

// ── In-memory store for crossing events ──────────────────────────────────────
const now = Date.now();
const min = 60_000;

const crossingEvents = [
  {
    id: 'evt-seed-1',
    event: 'entered',
    lat: 51.50421,
    lng: -0.08876,
    distanceMeters: 312,
    geofenceLat: 51.505,
    geofenceLng: -0.09,
    geofenceRadiusMeters: 500,
    timestamp: new Date(now - 2 * min).toISOString(),
    receivedAt: new Date(now - 2 * min).toISOString(),
  },
  {
    id: 'evt-seed-2',
    event: 'exited',
    lat: 51.50891,
    lng: -0.08103,
    distanceMeters: 782,
    geofenceLat: 51.505,
    geofenceLng: -0.09,
    geofenceRadiusMeters: 500,
    timestamp: new Date(now - 8 * min).toISOString(),
    receivedAt: new Date(now - 8 * min).toISOString(),
  },
  {
    id: 'evt-seed-3',
    event: 'entered',
    lat: 51.50634,
    lng: -0.09211,
    distanceMeters: 148,
    geofenceLat: 51.505,
    geofenceLng: -0.09,
    geofenceRadiusMeters: 500,
    timestamp: new Date(now - 15 * min).toISOString(),
    receivedAt: new Date(now - 15 * min).toISOString(),
  },
  {
    id: 'evt-seed-4',
    event: 'exited',
    lat: 51.49812,
    lng: -0.10044,
    distanceMeters: 901,
    geofenceLat: 51.505,
    geofenceLng: -0.09,
    geofenceRadiusMeters: 500,
    timestamp: new Date(now - 23 * min).toISOString(),
    receivedAt: new Date(now - 23 * min).toISOString(),
  },
  {
    id: 'evt-seed-5',
    event: 'entered',
    lat: 51.50712,
    lng: -0.08654,
    distanceMeters: 421,
    geofenceLat: 51.505,
    geofenceLng: -0.09,
    geofenceRadiusMeters: 500,
    timestamp: new Date(now - 41 * min).toISOString(),
    receivedAt: new Date(now - 41 * min).toISOString(),
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Scatter dummy users around a geofence center so the map looks realistic.
 * Each asset gets a position slightly offset from the London default center.
 */
function buildAssets(users) {
  // London geofence default center
  const BASE_LAT = 51.505;
  const BASE_LNG = -0.09;

  return users.map((user, i) => {
    // Spread assets within ~1 km of the center using a deterministic offset
    const angle = (2 * Math.PI * i) / users.length;
    const radiusDeg = 0.005 + (i % 3) * 0.003; // ~500 m – 1.3 km spread
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      company: user.company?.name ?? 'Unknown',
      position: {
        lat: parseFloat((BASE_LAT + radiusDeg * Math.sin(angle)).toFixed(6)),
        lng: parseFloat((BASE_LNG + radiusDeg * Math.cos(angle)).toFixed(6)),
      },
      status: i % 3 === 0 ? 'inside' : 'outside', // mix of statuses for demo
      lastSeen: new Date(Date.now() - i * 60_000).toISOString(),
    };
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/assets
 * Fetches 10 users from JSONPlaceholder and maps them to tracked asset objects.
 */
app.get('/api/assets', async (_req, res) => {
  try {
    // Node 18+ has built-in fetch; for older Node use node-fetch
    const response = await fetch('https://jsonplaceholder.typicode.com/users');
    if (!response.ok) {
      throw new Error(`JSONPlaceholder responded with ${response.status}`);
    }
    const users = await response.json();
    const assets = buildAssets(users);
    res.json({ assets, count: assets.length, source: 'jsonplaceholder.typicode.com' });
  } catch (err) {
    console.error('[GET /api/assets] Error:', err.message);
    res.status(502).json({ error: 'Failed to fetch dummy assets', detail: err.message });
  }
});

/**
 * POST /api/geofence-event
 * Body: GeofenceEventPayload (see Angular model)
 * Stores the event and returns it with an auto-generated id.
 */
app.post('/api/geofence-event', (req, res) => {
  const body = req.body;

  // Basic validation
  const required = ['event', 'lat', 'lng', 'distanceMeters', 'geofenceLat', 'geofenceLng', 'geofenceRadiusMeters', 'timestamp'];
  const missing = required.filter((k) => body[k] === undefined || body[k] === null);
  if (missing.length) {
    return res.status(400).json({ error: 'Missing required fields', missing });
  }

  const record = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...body,
    receivedAt: new Date().toISOString(),
  };

  crossingEvents.unshift(record); // newest first
  if (crossingEvents.length > 100) crossingEvents.pop(); // keep last 100

  console.log(`[Geofence] ${record.event.toUpperCase()} at (${record.lat}, ${record.lng}) — ${record.distanceMeters} m from center`);

  res.status(201).json({ id: record.id, acknowledged: true });
});

/**
 * GET /api/geofence-events
 * Returns all stored crossing events (newest first, max 100).
 */
app.get('/api/geofence-events', (_req, res) => {
  res.json({ events: crossingEvents, count: crossingEvents.length });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Geofence backend running at http://localhost:${PORT}`);
  console.log('  GET  /api/assets          — dummy tracked assets');
  console.log('  POST /api/geofence-event  — store a crossing event');
  console.log('  GET  /api/geofence-events — list all crossing events');
});
