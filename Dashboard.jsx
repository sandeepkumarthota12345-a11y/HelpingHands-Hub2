import DriveCard from '../components/DriveCard.jsx';
import { fmt } from '../format.js';
import { CAUSES } from '../../shared/seed.js';
import { completedDrives, driveSpotsLeft, myShifts, verifiedHours } from '../../shared/domain.js';

export default function Dashboard({ state, user, go, onOpen, onToggleInterest, busy }) {
  const mine = myShifts(state, user.email);
  const openSpots = state.drives.reduce((n, d) => n + driveSpotsLeft(d), 0);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h2>Find a volunteer shift near you</h2>
          <p>Browse local drives, pick a shift, and keep a record of the hours you give.</p>
          <div className="actions">
            <button className="btn" onClick={() => go('Explore drives', { matchesOnly: false })}>Browse drives</button>
            <button className="linkbtn" onClick={() => go('Explore drives', { matchesOnly: true })}>See my matches</button>
          </div>
        </div>
      </section>

      <div className="stats">
        <div className="stat"><label>Hours given</label><strong>{verifiedHours(state, user.email)} <small>hrs</small></strong><small>confirmed by organizers</small></div>
        <div className="stat"><label>Drives completed</label><strong>{completedDrives(state, user.email)}</strong></div>
        <div className="stat"><label>My sign-ups</label><strong>{mine.length}</strong><small>shifts booked</small></div>
        <div className="stat"><label>Open spots</label><strong>{openSpots}</strong><small>across all drives</small></div>
      </div>

      <div className="grid">
        <section>
          <div className="section-head">
            <div><h2>Upcoming drives</h2></div>
            <button className="linkbtn" onClick={() => go('Explore drives')}>All drives</button>
          </div>
          <div className="cards">
            {state.drives.slice(0, 2).map((d) => <DriveCard key={d.id} drive={d} state={state} onOpen={onOpen} />)}
          </div>
        </section>

        <aside className="side">
          <section className="panel">
            <h3>My shifts</h3>
            {mine.length ? mine.map((x) => (
              <div className="upcoming" key={x.shift.id}>
                <div>{x.drive.title}<small>{fmt(x.drive.date)} · {x.shift.period}</small></div>
              </div>
            )) : <p>You have no shifts yet.</p>}
          </section>
          <section className="panel">
            <h3>Causes I care about</h3>
            <p>Drives in these causes get a match score.</p>
            <div className="chips">
              {CAUSES.map((c) => {
                const on = state.interests.includes(c);
                return (
                  <button key={c} disabled={busy} className={`chip ${on ? 'selected' : ''}`} aria-pressed={on} onClick={() => onToggleInterest(c)}>
                    {on ? '✓' : '+'} {c}
                  </button>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
