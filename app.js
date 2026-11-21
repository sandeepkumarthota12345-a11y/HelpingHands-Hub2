import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { DomainError, signUp, cancelSignup, setAttendance, setInterests } from '../shared/domain.js';
import { USER } from '../shared/seed.js';

const keysMatch = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

export function createApp({
  store,
  organizerKey = process.env.ORGANIZER_KEY,
  production = process.env.NODE_ENV === 'production',
  today = () => new Date().toISOString().slice(0, 10),
  staticDir = null,
  rateLimitPerMinute = 120,
}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use('/api', rateLimit({ windowMs: 60_000, limit: rateLimitPerMinute, standardHeaders: true, legacyHeaders: false }));
  app.use(express.json({ limit: '10kb' }));

  // Only organizers can change attendance. In production a key must be configured.
  function requireOrganizer(req, res, next) {
    if (!organizerKey) {
      if (production) {
        return next(new DomainError('ORGANIZER_DISABLED', 'Organizer access is not configured on this server.', 503));
      }
      return next(); // local development only
    }
    const sent = req.get('x-organizer-key');
    if (!sent || !keysMatch(sent, organizerKey)) {
      return next(new DomainError('FORBIDDEN', 'Organizer key is missing or wrong.', 403));
    }
    next();
  }

  const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
  const api = express.Router();

  api.get('/health', (req, res) => res.json({ ok: true }));
  api.get('/state', (req, res) => res.json(store.get()));

  // Volunteer actions run as the demo user. A real deployment would take the identity from a login session.
  api.post('/signups', handle(async (req, res) => {
    const { driveId, shiftId } = req.body ?? {};
    res.status(201).json(await store.update((s) => signUp(s, { driveId, shiftId, user: USER })));
  }));

  api.post('/signups/cancel', handle(async (req, res) => {
    const { driveId, shiftId } = req.body ?? {};
    res.json(await store.update((s) => cancelSignup(s, { driveId, shiftId, email: USER.email })));
  }));

  api.put('/interests', handle(async (req, res) => {
    res.json(await store.update((s) => setInterests(s, req.body?.interests)));
  }));

  api.post('/attendance', requireOrganizer, handle(async (req, res) => {
    const { driveId, shiftId, email, attended } = req.body ?? {};
    res.json(await store.update((s) => setAttendance(s, { driveId, shiftId, email, attended, today: today() })));
  }));

  if (!production) {
    api.post('/reset', handle(async (req, res) => res.json(await store.reset())));
  }

  api.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown API route.' } }));
  app.use('/api', api);

  if (staticDir) {
    app.use(express.static(staticDir));
    app.get('*', (req, res) => res.sendFile('index.html', { root: staticDir }));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    }
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
      return res.status(err.status || 400).json({ error: { code: 'BAD_REQUEST', message: 'Request body is not valid.' } });
    }
    console.error(err); // details stay in the server log, not in the response
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Something went wrong on the server.' } });
  });

  return app;
}
