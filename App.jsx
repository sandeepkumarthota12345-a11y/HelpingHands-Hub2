import { useCallback, useEffect, useRef, useState } from 'react';
import { connect } from './api.js';
import { LONG, fmt } from './format.js';
import Dashboard from './pages/Dashboard.jsx';
import Explore from './pages/Explore.jsx';
import Impact from './pages/Impact.jsx';
import Organizer from './pages/Organizer.jsx';
import DriveModal from './components/DriveModal.jsx';

const PAGES = ['Dashboard', 'Explore drives', 'My impact', 'Organizer'];

export default function App() {
  const [store, setStore] = useState(null);
  const [state, setState] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState('Dashboard');
  const [selected, setSelected] = useState(null);
  const [orgDrive, setOrgDrive] = useState('tree');
  const [filters, setFilters] = useState({ category: 'All causes', query: '', matchesOnly: false });
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const loadAll = useCallback(async () => {
    setLoadError('');
    try {
      const s = await connect();
      setState(await s.load());
      setStore(s);
    } catch (e) {
      setLoadError(e.message || 'Could not load the app.');
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Runs one change at a time. If it fails (for example the shift filled up
  // while the page was open), show why and reload so the screen matches the data.
  const act = useCallback(async (fn, successMessage) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    try {
      setState(await fn(store));
      if (successMessage) setToast({ text: successMessage });
      return true;
    } catch (e) {
      setToast({ text: e.message || 'That did not work. Please try again.', error: true });
      try { setState(await store.load()); } catch { /* keep the current view */ }
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [store]);

  const go = (name, patch) => {
    setPage(name);
    setSelected(null);
    if (patch) setFilters((f) => ({ ...f, ...patch }));
  };

  if (loadError) {
    return (
      <main className="wrap main" role="alert">
        <h1>Could not load</h1>
        <p>{loadError}</p>
        <button className="btn" onClick={loadAll}>Try again</button>
      </main>
    );
  }
  if (!state) return <main className="wrap main"><p>Loading…</p></main>;

  const { user } = store;
  const drive = state.drives.find((d) => d.id === selected);
  const signedUp = state.drives.reduce((n, d) => n + d.shifts.reduce((m, s) => m + s.volunteers.length, 0), 0);

  return (
    <>
      <header className="topbar">
        <div className="brand"><span>HelpingHands<small>HUB</small></span></div>
        <nav className="nav" aria-label="Main navigation">
          {PAGES.map((p) => (
            <button key={p} className={page === p ? 'active' : ''} aria-current={page === p ? 'page' : undefined} onClick={() => go(p)}>{p}</button>
          ))}
        </nav>
        <div className="profile"><span className="avatar">AM</span><span className="name">{user.name}</span></div>
      </header>

      <main className="wrap main">
        <div className="heading">
          <h1>{page === 'Dashboard' ? 'Dashboard' : page}</h1>
          <span className="date">{fmt(new Date().toISOString().slice(0, 10), LONG)}</span>
        </div>
        {store.mode === 'browser' && (
          <p className="note">Running without a server: your data is saved in this browser only.</p>
        )}

        {page === 'Dashboard' && (
          <Dashboard state={state} user={user} go={go} onOpen={setSelected} busy={busy}
            onToggleInterest={(c) => act((s) => s.setInterests(
              state.interests.includes(c) ? state.interests.filter((x) => x !== c) : [...state.interests, c]
            ))} />
        )}
        {page === 'Explore drives' && <Explore state={state} filters={filters} setFilters={setFilters} onOpen={setSelected} />}
        {page === 'My impact' && <Impact state={state} user={user} go={go} />}
        {page === 'Organizer' && (
          <Organizer state={state} user={user} store={store} driveId={orgDrive} setDriveId={setOrgDrive} busy={busy}
            onAttendance={(d, sh, email, attended) => act((s) => s.setAttendance(d, sh, email, attended))} />
        )}
      </main>

      <footer className="wrap footer">
        <b>HelpingHands Hub</b>
        <span>{signedUp} volunteers signed up</span>
      </footer>

      {drive && (
        <DriveModal drive={drive} user={user} busy={busy} onClose={() => setSelected(null)}
          onSignUp={async (d, sh) => { if (await act((s) => s.signUp(d, sh), 'You are signed up.')) setSelected(null); }}
          onCancel={(d, sh) => act((s) => s.cancel(d, sh), 'Your spot was cancelled.')} />
      )}

      {toast && <div className={`toast ${toast.error ? 'error' : ''}`} role="status">{toast.text}</div>}
    </>
  );
}
