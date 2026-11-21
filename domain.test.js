import { describe, it, expect } from 'vitest';
import { buildSeed, USER } from '../shared/seed.js';
import {
  signUp, cancelSignup, setAttendance, setInterests, matchScore,
  verifiedHours, completedDrives, isValidState, spotsLeft,
} from '../shared/domain.js';
import { codeOf } from './helpers.js';

const find = (s, d, sh) => s.drives.find((x) => x.id === d).shifts.find((x) => x.id === sh);
const user = { ...USER };
const TREE = 'tree';
const MORNING = 'tree-morning';

describe('seed data', () => {
  it('has 8 drives, 20 shifts and 35 registrations, all valid', () => {
    const s = buildSeed();
    expect(s.drives).toHaveLength(8);
    expect(s.drives.flatMap((d) => d.shifts)).toHaveLength(20);
    expect(s.drives.flatMap((d) => d.shifts.flatMap((x) => x.volunteers))).toHaveLength(35);
    expect(isValidState(s)).toBe(true);
  });
});

describe('signUp', () => {
  it('adds the volunteer and lowers the open spot count', () => {
    const s = buildSeed();
    const before = spotsLeft(find(s, TREE, MORNING));
    const next = signUp(s, { driveId: TREE, shiftId: MORNING, user });
    expect(spotsLeft(find(next, TREE, MORNING))).toBe(before - 1);
  });

  it('does not change the original state', () => {
    const s = buildSeed();
    signUp(s, { driveId: TREE, shiftId: MORNING, user });
    expect(find(s, TREE, MORNING).volunteers.some((v) => v.email === user.email)).toBe(false);
  });

  it('rejects a second shift in the same drive', () => {
    const once = signUp(buildSeed(), { driveId: TREE, shiftId: MORNING, user });
    expect(codeOf(() => signUp(once, { driveId: TREE, shiftId: 'tree-evening', user }))).toBe('ALREADY_REGISTERED');
  });

  it('rejects a full shift', () => {
    const s = buildSeed();
    const shift = find(s, TREE, 'tree-evening');
    for (let i = shift.volunteers.length; i < shift.capacity; i++) {
      shift.volunteers.push({ name: `P${i}`, email: `p${i}@example.com`, phone: '', attended: false });
    }
    expect(codeOf(() => signUp(s, { driveId: TREE, shiftId: 'tree-evening', user }))).toBe('SHIFT_FULL');
  });

  it('rejects unknown drives and shifts', () => {
    const s = buildSeed();
    expect(codeOf(() => signUp(s, { driveId: 'nope', shiftId: MORNING, user }))).toBe('DRIVE_NOT_FOUND');
    expect(codeOf(() => signUp(s, { driveId: TREE, shiftId: 'nope', user }))).toBe('SHIFT_NOT_FOUND');
  });

  it('rejects malformed input', () => {
    const s = buildSeed();
    expect(codeOf(() => signUp(s, { driveId: { $ne: 1 }, shiftId: MORNING, user }))).toBe('BAD_INPUT');
    expect(codeOf(() => signUp(s, { driveId: '../etc', shiftId: MORNING, user }))).toBe('BAD_INPUT');
    expect(codeOf(() => signUp(s, { driveId: TREE, shiftId: MORNING, user: { name: 'A', email: 'not-an-email' } }))).toBe('BAD_INPUT');
    expect(codeOf(() => signUp(s, { driveId: TREE, shiftId: MORNING, user: { name: '', email: 'a@b.co' } }))).toBe('BAD_INPUT');
  });
});

describe('cancelSignup', () => {
  it('frees the spot', () => {
    const once = signUp(buildSeed(), { driveId: TREE, shiftId: MORNING, user });
    const next = cancelSignup(once, { driveId: TREE, shiftId: MORNING, email: user.email });
    expect(find(next, TREE, MORNING).volunteers.some((v) => v.email === user.email)).toBe(false);
  });

  it('fails when not registered', () => {
    expect(codeOf(() => cancelSignup(buildSeed(), { driveId: TREE, shiftId: MORNING, email: user.email }))).toBe('NOT_REGISTERED');
  });

  it('fails after attendance is confirmed', () => {
    let s = signUp(buildSeed(), { driveId: TREE, shiftId: MORNING, user });
    s = setAttendance(s, { driveId: TREE, shiftId: MORNING, email: user.email, attended: true, today: '2026-11-21' });
    expect(codeOf(() => cancelSignup(s, { driveId: TREE, shiftId: MORNING, email: user.email }))).toBe('ALREADY_ATTENDED');
  });
});

describe('setAttendance and hours', () => {
  const book = () => signUp(buildSeed(), { driveId: TREE, shiftId: MORNING, user });

  it('counts hours only after attendance is confirmed', () => {
    const s = book();
    expect(verifiedHours(s, user.email)).toBe(4); // earlier service record only
    const done = setAttendance(s, { driveId: TREE, shiftId: MORNING, email: user.email, attended: true, today: '2026-11-21' });
    expect(verifiedHours(done, user.email)).toBe(8);
    expect(completedDrives(done, user.email)).toBe(2);
  });

  it('can be undone', () => {
    let s = setAttendance(book(), { driveId: TREE, shiftId: MORNING, email: user.email, attended: true, today: '2026-11-21' });
    s = setAttendance(s, { driveId: TREE, shiftId: MORNING, email: user.email, attended: false, today: '2026-11-21' });
    expect(verifiedHours(s, user.email)).toBe(4);
  });

  it('refuses to confirm attendance before the drive date', () => {
    const s = signUp(buildSeed(), { driveId: 'river', shiftId: 'river-morning', user });
    expect(codeOf(() => setAttendance(s, { driveId: 'river', shiftId: 'river-morning', email: user.email, attended: true, today: '2026-11-21' }))).toBe('TOO_EARLY');
  });

  it('rejects non-boolean values and unknown volunteers', () => {
    const s = book();
    expect(codeOf(() => setAttendance(s, { driveId: TREE, shiftId: MORNING, email: user.email, attended: 'yes' }))).toBe('BAD_INPUT');
    expect(codeOf(() => setAttendance(s, { driveId: TREE, shiftId: MORNING, email: 'x@y.co', attended: true }))).toBe('NOT_REGISTERED');
  });
});

describe('interests and matching', () => {
  it('scores by Jaccard similarity', () => {
    const s = buildSeed(); // interests: Environment, Education
    const env = s.drives.find((d) => d.category === 'Environment');
    const health = s.drives.find((d) => d.category === 'Health');
    expect(matchScore(s, env)).toBe(50);
    expect(matchScore(s, health)).toBe(0);
  });

  it('accepts known causes and removes duplicates', () => {
    expect(setInterests(buildSeed(), ['Health', 'Health']).interests).toEqual(['Health']);
  });

  it('rejects unknown causes and non-arrays', () => {
    expect(codeOf(() => setInterests(buildSeed(), ['Politics']))).toBe('BAD_INPUT');
    expect(codeOf(() => setInterests(buildSeed(), 'Health'))).toBe('BAD_INPUT');
  });
});

describe('isValidState', () => {
  it('rejects bad shapes and over-capacity shifts', () => {
    expect(isValidState(null)).toBe(false);
    expect(isValidState({ drives: 'x', interests: [], past: [] })).toBe(false);
    const s = buildSeed();
    s.drives[0].shifts[0].capacity = 1;
    expect(isValidState(s)).toBe(false);
  });
});
