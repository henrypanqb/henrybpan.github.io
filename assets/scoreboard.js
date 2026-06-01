const DAY = 86400000;
const toUTC = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const fmtUTC = (ms) => new Date(ms).toISOString().slice(0, 10);
const ymd = (s) => s.split('-').map(Number);

/** @param {string[]} dates  @param {string} today YYYY-MM-DD  @returns {number} consecutive-day streak ending today (one grace day allowed) */
export function devotionalStreak(dates, today) {
  const set = new Set(dates);
  let cur = toUTC(today);
  if (!set.has(fmtUTC(cur))) {
    cur -= DAY;
    if (!set.has(fmtUTC(cur))) return 0;
  }
  let streak = 0;
  while (set.has(fmtUTC(cur))) { streak++; cur -= DAY; }
  return streak;
}

/** @param {string[]} dates  @param {string} today YYYY-MM-DD  @returns {{streak: number, status: 'posted-today'|'grace'|'missed'}} */
export function devotionalStatus(dates, today) {
  const set = new Set(dates);
  const streak = devotionalStreak(dates, today);
  let status;
  if (set.has(today)) status = 'posted-today';
  else if (set.has(fmtUTC(toUTC(today) - DAY))) status = 'grace';
  else status = 'missed';
  return { streak, status };
}

/** @param {string} lastVideo YYYY-MM-DD  @param {string} today YYYY-MM-DD  @returns {{status: 'on-track'|'due', daysLeft: number, daysSince: number}} */
export function videoStatus(lastVideo, today) {
  const diff = Math.floor((toUTC(today) - toUTC(lastVideo)) / DAY);
  const daysLeft = Math.max(0, 7 - diff);
  return { status: diff <= 7 ? 'on-track' : 'due', daysLeft, daysSince: diff };
}

/** @param {string} lastEssay YYYY-MM-DD  @param {string} today YYYY-MM-DD  @returns {{status: 'done'|'due'}} */
export function essayStatus(lastEssay, today) {
  const [ly, lm] = ymd(lastEssay);
  const [ty, tm] = ymd(today);
  return { status: (ly === ty && lm === tm) ? 'done' : 'due' };
}
