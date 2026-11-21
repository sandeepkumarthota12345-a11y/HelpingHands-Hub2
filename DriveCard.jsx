import { causeCode, fmt } from '../format.js';
import { driveSpotsLeft, matchScore } from '../../shared/domain.js';

export default function DriveCard({ drive, state, onOpen }) {
  const match = matchScore(state, drive);
  return (
    <article className="card">
      <div className={`card-art ${drive.theme}`}>
        <span>{causeCode(drive.category)}</span>
        <span className="art-org">{drive.org}</span>
        {match > 0 && <span className="match">{match}% match</span>}
      </div>
      <div className="card-body">
        <div className="meta"><span className="tag">{drive.category}</span><span>{fmt(drive.date)}</span></div>
        <h3>{drive.title}</h3>
        <p className="loc">{drive.place}</p>
        <p className="goal">{drive.goal}</p>
        <div className="card-bottom">
          <span>{driveSpotsLeft(drive)} spots left</span>
          <button onClick={() => onOpen(drive.id)}>See details</button>
        </div>
      </div>
    </article>
  );
}
