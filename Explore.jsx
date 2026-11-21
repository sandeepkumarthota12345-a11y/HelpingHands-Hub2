import DriveCard from '../components/DriveCard.jsx';
import { matchScore } from '../../shared/domain.js';

const FILTERS = ['All causes', 'Environment', 'Education', 'Health', 'Animal Welfare'];

export default function Explore({ state, filters, setFilters, onOpen }) {
  const { category, query, matchesOnly } = filters;
  const q = query.trim().toLowerCase();
  const list = state.drives
    .filter((d) => category === 'All causes' || d.category === category)
    .filter((d) => !matchesOnly || state.interests.includes(d.category))
    .filter((d) => !q || `${d.title} ${d.org} ${d.place} ${d.category}`.toLowerCase().includes(q))
    .sort((a, b) => matchScore(state, b) - matchScore(state, a) || a.date.localeCompare(b.date));

  return (
    <>
      <section className="explore-intro">
        <div><h2>Volunteer drives</h2><p>{state.drives.length} drives are open for sign-up.</p></div>
      </section>
      <div className="searchrow">
        <label className="search">
          <input value={query} maxLength={80} placeholder="Search by name, cause or place" aria-label="Search drives"
            onChange={(e) => setFilters({ ...filters, query: e.target.value })} />
        </label>
        <button className={`matchtoggle ${matchesOnly ? 'active' : ''}`} aria-pressed={matchesOnly}
          onClick={() => setFilters({ ...filters, matchesOnly: !matchesOnly })}>
          Matched to me
        </button>
      </div>
      <div className="filters">
        {FILTERS.map((c) => (
          <button key={c} className={`filter ${category === c ? 'active' : ''}`} onClick={() => setFilters({ ...filters, category: c })}>{c}</button>
        ))}
      </div>
      <div className="results"><span>{list.length} drives</span><span>Sorted by match, then date</span></div>
      {list.length
        ? <div className="cards explorecards">{list.map((d) => <DriveCard key={d.id} drive={d} state={state} onOpen={onOpen} />)}</div>
        : <div className="empty">No drives match. Try another cause or clear the search.</div>}
    </>
  );
}
