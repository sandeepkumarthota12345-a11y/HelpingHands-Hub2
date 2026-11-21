import { describe, it, expect } from 'vitest';
import { createLocalStore } from '../src/api.js';
import { codeOf } from './helpers.js';

function fakeStorage(initial = {}, failWrites = false) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { if (failWrites) throw new Error('quota'); data[k] = v; },
  };
}

describe('browser-only store', () => {
  it('saves a sign-up so a new store instance sees it', async () => {
    const storage = fakeStorage();
    await createLocalStore(storage).signUp('tree', 'tree-morning');
    const state = await createLocalStore(storage).load();
    const shift = state.drives.find((d) => d.id === 'tree').shifts.find((s) => s.id === 'tree-morning');
    expect(shift.volunteers.some((v) => v.email === 'alex.morgan@example.com')).toBe(true);
  });

  it('recovers from corrupted saved data', async () => {
    const state = await createLocalStore(fakeStorage({ 'helpinghands-state-v2': '{not json' })).load();
    expect(state.drives).toHaveLength(8);
  });

  it('reports a failed save and leaves the state unchanged', async () => {
    const store = createLocalStore(fakeStorage({}, true));
    await store.load();
    expect(await codeOf(() => store.signUp('tree', 'tree-morning'))).toBe('STORAGE_FULL');
    const state = await store.load();
    expect(state.drives[0].shifts[0].volunteers.some((v) => v.email === 'alex.morgan@example.com')).toBe(false);
  });

  it('surfaces rule violations as errors', async () => {
    const store = createLocalStore(fakeStorage());
    await store.signUp('tree', 'tree-morning');
    expect(await codeOf(() => store.signUp('tree', 'tree-evening'))).toBe('ALREADY_REGISTERED');
  });

  it('blocks attendance before the drive date', async () => {
    const store = createLocalStore(fakeStorage(), () => '2026-11-01');
    await store.signUp('tree', 'tree-morning');
    expect(await codeOf(() => store.setAttendance('tree', 'tree-morning', 'alex.morgan@example.com', true))).toBe('TOO_EARLY');
  });
});
