import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { createApp } from './app.js';
import { createStore } from './store.js';
import { buildSeed } from '../shared/seed.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || '127.0.0.1';
const file = process.env.DATA_FILE || path.join(root, 'data', 'state.json');
const dist = path.join(root, 'dist');

const store = await createStore({ file, seed: buildSeed });
const app = createApp({ store, staticDir: fs.existsSync(dist) ? dist : null });

app.listen(port, host, () => console.log(`HelpingHands API on http://${host}:${port} (data: ${file})`));
