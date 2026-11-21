// File-backed state store. Writes go through one queue and are saved atomically,
// so a crash cannot leave a half-written file and two requests cannot overwrite each other.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { isValidState } from '../shared/domain.js';

export async function createStore({ file = null, seed }) {
  let state = null;

  async function persist(next) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(next, null, 2));
    await fs.rename(tmp, file);
  }

  if (file) {
    try {
      const saved = JSON.parse(await fs.readFile(file, 'utf8'));
      if (isValidState(saved)) state = saved;
    } catch {
      // Missing or unreadable file: start from the seed below.
    }
  }
  if (!state) {
    state = seed();
    if (file) await persist(state);
  }

  let queue = Promise.resolve();
  function update(fn) {
    const run = queue.then(async () => {
      const next = fn(state); // may throw a DomainError; state is left untouched
      if (file) await persist(next);
      state = next; // only replaced after the write succeeded
      return next;
    });
    queue = run.catch(() => {});
    return run;
  }

  return { get: () => state, update, reset: () => update(() => seed()) };
}
