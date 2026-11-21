import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/app.js';
import { createStore } from '../server/store.js';
import { buildSeed } from '../shared/seed.js';

const ME = 'alex.morgan@example.com';
const TODAY = '2026-11-21';

async function makeApp(options = {}) {
  const store = await createStore({ seed: buildSeed });
  return { store, app: createApp({ store, today: () => TODAY, rateLimitPerMinute: 1000, organizerKey: undefined, production: false, ...options }) };
}

describe('volunteer endpoints', () => {
  let app;
  beforeEach(async () => { ({ app } = await makeApp()); });

  it('GET /api/state returns the drives', async () => {
    const res = await request(app).get('/api/state');
    expect(res.status).toBe(200);
    expect(res.body.drives).toHaveLength(8);
  });

  it('signs up, then rejects a duplicate with 409', async () => {
    const ok = await request(app).post('/api/signups').send({ driveId: 'tree', shiftId: 'tree-morning' });
    expect(ok.status).toBe(201);
    const dup = await request(app).post('/api/signups').send({ driveId: 'tree', shiftId: 'tree-evening' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('ALREADY_REGISTERED');
  });

  it('cancels a sign-up', async () => {
    await request(app).post('/api/signups').send({ driveId: 'tree', shiftId: 'tree-morning' });
    const res = await request(app).post('/api/signups/cancel').send({ driveId: 'tree', shiftId: 'tree-morning' });
    expect(res.status).toBe(200);
    const shift = res.body.drives[0].shifts[0];
    expect(shift.volunteers.some((v) => v.email === ME)).toBe(false);
  });

  it('returns 404 for an unknown drive and 400 for bad input', async () => {
    expect((await request(app).post('/api/signups').send({ driveId: 'nope', shiftId: 'x' })).status).toBe(404);
    expect((await request(app).post('/api/signups').send({ driveId: ['a'], shiftId: 'x' })).status).toBe(400);
    expect((await request(app).post('/api/signups').send({})).status).toBe(400);
  });

  it('rejects malformed JSON and oversized bodies without leaking details', async () => {
    const bad = await request(app).post('/api/signups').set('Content-Type', 'application/json').send('{oops');
    expect(bad.status).toBe(400);
    const big = await request(app).post('/api/signups').send({ driveId: 'a'.repeat(20000) });
    expect(big.status).toBe(413);
    expect(JSON.stringify(bad.body)).not.toMatch(/at .*\.js/);
  });

  it('never oversells a shift when requests arrive together', async () => {
    const { app: a, store } = await makeApp();
    const shift = store.get().drives.find((d) => d.id === 'tree').shifts.find((s) => s.id === 'tree-evening');
    for (let i = shift.volunteers.length; i < shift.capacity - 1; i++) {
      shift.volunteers.push({ name: `P${i}`, email: `p${i}@example.com`, phone: '', attended: false });
    }
    // One spot left. Fire two sign-ups at once; exactly one can win.
    const results = await Promise.all([
      request(a).post('/api/signups').send({ driveId: 'tree', shiftId: 'tree-evening' }),
      request(a).post('/api/signups').send({ driveId: 'tree', shiftId: 'tree-evening' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it('updates interests and rejects unknown ones', async () => {
    expect((await request(app).put('/api/interests').send({ interests: ['Health'] })).body.interests).toEqual(['Health']);
    expect((await request(app).put('/api/interests').send({ interests: ['Nope'] })).status).toBe(400);
  });

  it('returns JSON 404 for unknown API routes and sets security headers', async () => {
    const res = await request(app).get('/api/nothing');
    expect(res.status).toBe(404);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('organizer endpoint', () => {
  const body = { driveId: 'tree', shiftId: 'tree-morning', email: ME, attended: true };

  it('requires the key when one is configured', async () => {
    const { app } = await makeApp({ organizerKey: 'secret-key' });
    await request(app).post('/api/signups').send({ driveId: 'tree', shiftId: 'tree-morning' });
    expect((await request(app).post('/api/attendance').send(body)).status).toBe(403);
    expect((await request(app).post('/api/attendance').set('X-Organizer-Key', 'wrong').send(body)).status).toBe(403);
    expect((await request(app).post('/api/attendance').set('X-Organizer-Key', 'secret-key').send(body)).status).toBe(200);
  });

  it('is disabled in production when no key is set', async () => {
    const { app } = await makeApp({ production: true });
    expect((await request(app).post('/api/attendance').send(body)).status).toBe(503);
  });

  it('blocks confirming attendance before the drive date', async () => {
    const { app } = await makeApp();
    await request(app).post('/api/signups').send({ driveId: 'river', shiftId: 'river-morning' });
    const res = await request(app).post('/api/attendance').send({ ...body, driveId: 'river', shiftId: 'river-morning' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TOO_EARLY');
  });

  it('has no reset route in production', async () => {
    const { app } = await makeApp({ production: true, organizerKey: 'k' });
    expect((await request(app).post('/api/reset')).status).toBe(404);
  });
});

describe('file persistence', () => {
  it('keeps sign-ups after the server restarts', async () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hh-')), 'state.json');
    const first = await createStore({ file, seed: buildSeed });
    await request(createApp({ store: first, organizerKey: 'k' })).post('/api/signups').send({ driveId: 'tree', shiftId: 'tree-morning' });

    const second = await createStore({ file, seed: buildSeed });
    const shift = second.get().drives[0].shifts[0];
    expect(shift.volunteers.some((v) => v.email === ME)).toBe(true);
  });

  it('starts fresh when the data file is corrupted', async () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hh-')), 'state.json');
    fs.writeFileSync(file, '{broken');
    const store = await createStore({ file, seed: buildSeed });
    expect(store.get().drives).toHaveLength(8);
  });
});
