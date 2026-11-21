// Two interchangeable stores with the same methods:
//  - remote: talks to the Express server, which keeps data on disk
//  - local: runs the same rules in the browser and saves to localStorage (used when no server is reachable)
import { signUp, cancelSignup, setAttendance, setInterests, isValidState } from '../shared/domain.js';
import { buildSeed, USER } from '../shared/seed.js';

export class ApiError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const today = () => new Date().toISOString().slice(0, 10);
const KEY_STORAGE = 'helpinghands-organizer-key';

export function createRemoteStore(base = '/api', fetchImpl = (...a) => fetch(...a)) {
  let organizerKey = '';
  try { organizerKey = sessionStorage.getItem(KEY_STORAGE) || ''; } catch { /* storage blocked */ }

  async function call(path, { method = 'GET', body, organizer = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (organizer && organizerKey) headers['X-Organizer-Key'] = organizerKey;
    let res;
    try {
      res = await fetchImpl(base + path, {
        method, headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new ApiError('NETWORK', 'Could not reach the server. Check your connection and try again.');
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(data?.error?.code ?? 'SERVER_ERROR', data?.error?.message ?? 'Something went wrong.', res.status);
    }
    return data;
  }

  return {
    mode: 'server',
    user: USER,
    load: () => call('/state'),
    signUp: (driveId, shiftId) => call('/signups', { method: 'POST', body: { driveId, shiftId } }),
    cancel: (driveId, shiftId) => call('/signups/cancel', { method: 'POST', body: { driveId, shiftId } }),
    setInterests: (interests) => call('/interests', { method: 'PUT', body: { interests } }),
    setAttendance: (driveId, shiftId, email, attended) =>
      call('/attendance', { method: 'POST', organizer: true, body: { driveId, shiftId, email, attended } }),
    setOrganizerKey(key) {
      organizerKey = key;
      try { sessionStorage.setItem(KEY_STORAGE, key); } catch { /* ignore */ }
    },
  };
}

export function createLocalStore(storage = globalThis.localStorage, clock = today) {
  const KEY = 'helpinghands-state-v2';
  let state = null;

  function read() {
    try {
      const saved = JSON.parse(storage.getItem(KEY));
      if (isValidState(saved)) return saved;
    } catch { /* fall through to the seed */ }
    return buildSeed();
  }

  function commit(fn) {
    const next = fn(state ?? read()); // throws DomainError before anything is changed
    try {
      storage.setItem(KEY, JSON.stringify(next));
    } catch {
      throw new ApiError('STORAGE_FULL', 'Could not save in this browser. Free some space or allow site storage.');
    }
    state = next;
    return Promise.resolve(next);
  }

  return {
    mode: 'browser',
    user: USER,
    load: () => Promise.resolve((state = read())),
    signUp: (driveId, shiftId) => commit((s) => signUp(s, { driveId, shiftId, user: USER })),
    cancel: (driveId, shiftId) => commit((s) => cancelSignup(s, { driveId, shiftId, email: USER.email })),
    setInterests: (interests) => commit((s) => setInterests(s, interests)),
    setAttendance: (driveId, shiftId, email, attended) =>
      commit((s) => setAttendance(s, { driveId, shiftId, email, attended, today: clock() })),
    setOrganizerKey() {},
  };
}

// Use the server when it answers, otherwise fall back to browser-only mode.
export async function connect() {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(2500) });
    const isJson = (res.headers.get('content-type') || '').includes('json');
    if (res.ok && isJson) return createRemoteStore();
  } catch { /* no server */ }
  return createLocalStore();
}
