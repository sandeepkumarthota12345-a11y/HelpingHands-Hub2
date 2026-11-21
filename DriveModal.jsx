import { useEffect } from 'react';
import { LONG, fmt } from '../format.js';
import { spotsLeft } from '../../shared/domain.js';

export default function DriveModal({ drive, user, busy, onClose, onSignUp, onCancel }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hasSpot = drive.shifts.some((s) => s.volunteers.some((v) => v.email === user.email));

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={drive.title}>
        <button className="close" onClick={onClose} aria-label="Close">×</button>
        <div className={`modal-banner ${drive.theme}`} />
        <div className="modal-content">
          <p className="eyebrow">{fmt(drive.date, LONG)} · {drive.place}</p>
          <h2>{drive.title}</h2>
          <p><b>{drive.goal}</b></p>
          <p>{drive.description}</p>
          <p>{drive.hours} hours per shift · {drive.category} · {drive.org}</p>
          <h3>Choose a shift</h3>
          {drive.shifts.map((s) => {
            const mine = s.volunteers.some((v) => v.email === user.email);
            const left = spotsLeft(s);
            let label = 'Sign up';
            if (mine) label = 'Cancel my spot';
            else if (hasSpot) label = 'One shift per drive';
            else if (left === 0) label = 'Full';
            return (
              <div className="shift" key={s.id}>
                <div><b>{s.period}</b><small>{s.time} · {left} spots left</small></div>
                <button
                  disabled={busy || (!mine && (hasSpot || left === 0))}
                  onClick={() => (mine ? onCancel(drive.id, s.id) : onSignUp(drive.id, s.id))}
                >
                  {label}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
