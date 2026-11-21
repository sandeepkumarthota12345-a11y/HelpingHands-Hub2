// Business rules for sign-ups, attendance and interests.
// Every function is pure: it takes a state, returns a new state, or throws a DomainError.
// The server and the browser-only fallback both call these, so the rules live in one place.
import { CAUSES } from './seed.js';

export class DomainError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.status = status;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_RE = /^[a-z0-9-]{1,60}$/i;

function requireId(value, label) {
  if (typeof value !== 'string' || !ID_RE.test(value)) {
    throw new DomainError('BAD_INPUT', `Invalid ${label}.`);
  }
  return value;
}

export function normalizeEmail(value) {
  if (typeof value !== 'string' || value.length > 254 || !EMAIL_RE.test(value.trim())) {
    throw new DomainError('BAD_INPUT', 'A valid email address is required.');
  }
  return value.trim().toLowerCase();
}

export function validateUser(user) {
  if (!user || typeof user.name !== 'string' || !user.name.trim() || user.name.length > 100) {
    throw new DomainError('BAD_INPUT', 'A name of up to 100 characters is required.');
  }
  return {
    name: user.name.trim(),
    email: normalizeEmail(user.email),
    phone: typeof user.phone === 'string' ? user.phone.slice(0, 30) : '',
  };
}

function locate(state, driveId, shiftId) {
  requireId(driveId, 'drive id');
  requireId(shiftId, 'shift id');
  const drive = state.drives.find((d) => d.id === driveId);
  if (!drive) throw new DomainError('DRIVE_NOT_FOUND', 'That drive no longer exists.', 404);
  const shift = drive.shifts.find((s) => s.id === shiftId);
  if (!shift) throw new DomainError('SHIFT_NOT_FOUND', 'That shift no longer exists.', 404);
  return { drive, shift };
}

export const spotsLeft = (shift) => Math.max(0, shift.capacity - shift.volunteers.length);
export const driveSpotsLeft = (drive) => drive.shifts.reduce((n, s) => n + spotsLeft(s), 0);

export function signUp(state, { driveId, shiftId, user }) {
  const person = validateUser(user);
  const next = structuredClone(state);
  const { drive, shift } = locate(next, driveId, shiftId);
  if (drive.shifts.some((s) => s.volunteers.some((v) => v.email === person.email))) {
    throw new DomainError('ALREADY_REGISTERED', 'You already have a shift in this drive.', 409);
  }
  if (spotsLeft(shift) === 0) {
    throw new DomainError('SHIFT_FULL', 'That shift is full.', 409);
  }
  shift.volunteers.push({ ...person, attended: false });
  return next;
}

export function cancelSignup(state, { driveId, shiftId, email }) {
  const address = normalizeEmail(email);
  const next = structuredClone(state);
  const { shift } = locate(next, driveId, shiftId);
  const volunteer = shift.volunteers.find((v) => v.email === address);
  if (!volunteer) throw new DomainError('NOT_REGISTERED', 'You are not signed up for this shift.', 404);
  if (volunteer.attended) {
    throw new DomainError('ALREADY_ATTENDED', 'Attendance is already confirmed, so this shift cannot be cancelled.', 409);
  }
  shift.volunteers = shift.volunteers.filter((v) => v.email !== address);
  return next;
}

export function setAttendance(state, { driveId, shiftId, email, attended, today }) {
  if (typeof attended !== 'boolean') throw new DomainError('BAD_INPUT', 'attended must be true or false.');
  const address = normalizeEmail(email);
  const next = structuredClone(state);
  const { drive, shift } = locate(next, driveId, shiftId);
  const volunteer = shift.volunteers.find((v) => v.email === address);
  if (!volunteer) throw new DomainError('NOT_REGISTERED', 'That volunteer is not on this shift.', 404);
  if (attended && today && drive.date > today) {
    throw new DomainError('TOO_EARLY', 'Attendance can only be confirmed on or after the drive date.', 409);
  }
  volunteer.attended = attended;
  return next;
}

export function setInterests(state, interests) {
  if (!Array.isArray(interests) || interests.length > CAUSES.length) {
    throw new DomainError('BAD_INPUT', 'Interests must be a list of known causes.');
  }
  if (!interests.every((c) => CAUSES.includes(c))) {
    throw new DomainError('BAD_INPUT', 'Unknown cause in interests.');
  }
  return { ...structuredClone(state), interests: [...new Set(interests)] };
}

// ---- Read-only helpers ----

export const myShifts = (state, email) =>
  state.drives.flatMap((drive) =>
    drive.shifts.flatMap((shift) =>
      shift.volunteers.filter((v) => v.email === email).map((volunteer) => ({ drive, shift, volunteer }))
    )
  );

export const verifiedHours = (state, email) =>
  state.past.reduce((n, p) => n + p.hours, 0) +
  myShifts(state, email).reduce((n, x) => n + (x.volunteer.attended ? x.drive.hours : 0), 0);

export const completedDrives = (state, email) =>
  state.past.length +
  new Set(myShifts(state, email).filter((x) => x.volunteer.attended).map((x) => x.drive.id)).size;

// Jaccard similarity between the person's interests and the drive's cause, as a percentage.
export function matchScore(state, drive) {
  const mine = new Set(state.interests);
  const theirs = new Set([drive.category]);
  const overlap = [...theirs].filter((c) => mine.has(c)).length;
  const union = new Set([...mine, ...theirs]).size;
  return union === 0 ? 0 : Math.round((overlap / union) * 100);
}

// Shape check for data loaded from disk or localStorage. Anything that fails falls back to the seed.
export function isValidState(s) {
  try {
    if (!s || !Array.isArray(s.drives) || !Array.isArray(s.interests) || !Array.isArray(s.past)) return false;
    return s.drives.every(
      (d) =>
        typeof d.id === 'string' && typeof d.title === 'string' && typeof d.date === 'string' &&
        typeof d.hours === 'number' && Array.isArray(d.shifts) &&
        d.shifts.every(
          (sh) =>
            typeof sh.id === 'string' && Number.isInteger(sh.capacity) && Array.isArray(sh.volunteers) &&
            sh.volunteers.length <= sh.capacity &&
            sh.volunteers.every((v) => typeof v.email === 'string' && typeof v.attended === 'boolean')
        )
    );
  } catch {
    return false;
  }
}
