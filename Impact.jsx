import { WITH_YEAR, badgeFor, causeCode, fmt } from '../format.js';
import { completedDrives, myShifts, verifiedHours } from '../../shared/domain.js';

export default function Impact({ state, user, go }) {
  const hours = verifiedHours(state, user.email);
  const rows = [
    ...state.past.map((p) => ({ id: p.id, title: p.title, date: p.date, hours: p.hours, verified: true, code: 'VOL' })),
    ...myShifts(state, user.email).map((x) => ({
      id: x.shift.id, title: x.drive.title, date: x.drive.date, hours: x.drive.hours,
      verified: x.volunteer.attended, code: causeCode(x.drive.category),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <section className="impact-banner">
        <div><h2>Your volunteer hours</h2><p>Hours count once an organizer confirms you attended.</p></div>
        <div className="total"><strong>{hours}</strong><span>verified<br />hours</span></div>
      </section>
      <div className="impactstats">
        <div className="stat"><label>Verified hours</label><strong>{hours} hrs</strong></div>
        <div className="stat"><label>Drives completed</label><strong>{completedDrives(state, user.email)}</strong></div>
        <div className="panel badgebox"><div><h3>{badgeFor(hours)}</h3></div></div>
      </div>
      <div className="grid">
        <section className="activity">
          <div className="section-head">
            <div><h2>Service history</h2></div>
            <button className="linkbtn" onClick={() => window.print()}>Print certificate</button>
          </div>
          {rows.map((r) => (
            <div className="activity-row" key={r.id}>
              <span className="emoji">{r.code}</span>
              <div>{r.title}<small>{fmt(r.date, WITH_YEAR)}</small></div>
              <b className={r.verified ? 'verified' : ''}>{r.verified ? `+${r.hours} hrs` : 'Upcoming'}<small>{r.verified ? 'Verified' : 'Not confirmed'}</small></b>
            </div>
          ))}
        </section>
        <aside className="panel">
          <h3>Find another shift</h3>
          <p>Browse drives that still have open spots.</p>
          <button className="btn" onClick={() => go('Explore drives')}>Browse drives</button>
        </aside>
      </div>
    </>
  );
}
