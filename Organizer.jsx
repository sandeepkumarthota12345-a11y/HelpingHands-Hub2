import { useState } from 'react';
import { LONG, fmt } from '../format.js';

export default function Organizer({ state, user, store, driveId, setDriveId, busy, onAttendance }) {
  const drive = state.drives.find((d) => d.id === driveId) ?? state.drives[0];
  const rows = drive.shifts.flatMap((s) => s.volunteers.map((v) => ({ ...v, shift: s })));
  const present = rows.filter((v) => v.attended).length;
  const capacity = drive.shifts.reduce((n, s) => n + s.capacity, 0);
  const [key, setKey] = useState('');

  return (
    <>
      <section className="org-banner">
        <div><h2>Organizer check-in</h2><p>Confirm who showed up. Confirmed hours appear on each volunteer's impact page.</p></div>
      </section>

      {store.mode === 'server' && (
        <div className="organizer-select">
          <label>
            Organizer key{' '}
            <input type="password" autoComplete="off" value={key} placeholder="Only needed if the server sets one"
              onChange={(e) => { setKey(e.target.value); store.setOrganizerKey(e.target.value); }} />
          </label>
        </div>
      )}

      <div className="organizer-select">
        <div><h2>Roster</h2></div>
        <select value={drive.id} aria-label="Choose a drive" onChange={(e) => setDriveId(e.target.value)}>
          {state.drives.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
      </div>

      <div className="orgstats">
        <div className="orgstat"><strong>{rows.length} / {capacity}</strong><small>registered</small></div>
        <div className="orgstat"><strong>{present} / {rows.length}</strong><small>attended</small></div>
        <div className="orgstat"><strong>{drive.hours} hrs</strong><small>per shift</small></div>
        <div className="orgstat"><strong>{drive.area}</strong><small>{fmt(drive.date)}</small></div>
      </div>

      <section className="roster">
        <p className="eyebrow">{drive.org}</p>
        <h3>{drive.title}</h3>
        <p>{fmt(drive.date, LONG)} · {drive.place}</p>
        <table className="table">
          <thead><tr><th>Volunteer</th><th>Shift</th><th>Contact</th><th>Attendance</th><th>Action</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((v) => (
              <tr key={`${v.shift.id}-${v.email}`}>
                <td>{v.name}{v.email === user.email ? ' (you)' : ''}</td>
                <td>{v.shift.period}</td>
                <td><a href={`mailto:${encodeURIComponent(v.email)}`}>{v.email}</a><br />{v.phone}</td>
                <td className={v.attended ? 'status present' : ''}>{v.attended ? 'Attended' : 'Not checked in'}</td>
                <td>
                  <button disabled={busy} onClick={() => onAttendance(drive.id, v.shift.id, v.email, !v.attended)}>
                    {v.attended ? 'Undo' : 'Mark attended'}
                  </button>
                </td>
              </tr>
            )) : <tr><td colSpan="5">No sign-ups yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
