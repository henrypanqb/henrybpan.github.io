import { devotionalStatus, videoStatus, essayStatus } from './scoreboard.js';

// Viewer-local calendar day (sv locale yields YYYY-MM-DD) so the streak clock
// matches the visitor's own date rather than rolling over early in UTC.
const todayISO = () => new Date().toLocaleDateString('sv');

function setCell(id, big, unit, statusText, statusClass) {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelector('.sb-big').textContent = big;
  el.querySelector('.sb-unit').textContent = unit;
  const chip = el.querySelector('.sb-chip');
  chip.textContent = statusText;
  chip.className = 'sb-chip ' + statusClass;
}

function renderScoreboard(data, today) {
  const devo = devotionalStatus(data.devotionalDates || [], today);
  const devoMap = { 'posted-today': ['on track', 'ok'], grace: ['due today', 'due'], missed: ['missed', 'miss'] };
  const [devoText, devoClass] = devoMap[devo.status];
  setCell('sb-devo', devo.streak, 'day streak', devoText, devoClass);

  if (data.lastVideo) {
    const v = videoStatus(data.lastVideo, today);
    setCell('sb-video', v.status === 'on-track' ? v.daysLeft : '!', v.status === 'on-track' ? 'days left' : 'overdue',
      v.status === 'on-track' ? 'on track' : 'due', v.status === 'on-track' ? 'ok' : 'due');
  }
  if (data.lastEssay) {
    const e = essayStatus(data.lastEssay, today);
    setCell('sb-essay', e.status === 'done' ? '1' : '0', 'this month',
      e.status === 'done' ? 'done' : 'due', e.status === 'done' ? 'ok' : 'due');
  }
}

function renderPlate(data) {
  const plate = document.getElementById('video-plate');
  if (!plate || !data.latestVideo) return;
  const id = data.latestVideo.id;
  const img = plate.querySelector('img');
  img.src = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  img.alt = data.latestVideo.title || '';
  const play = () => {
    const f = document.createElement('iframe');
    f.src = `https://www.youtube.com/embed/${id}?autoplay=1`;
    f.title = data.latestVideo.title || 'video';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.allowFullscreen = true;
    plate.replaceChildren(f);
    plate.classList.add('is-playing');
  };
  plate.addEventListener('click', play, { once: true });
  plate.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); plate.click(); }
  });
}

function renderLatestDevotional(data) {
  const slot = document.getElementById('latest-devotional');
  if (!slot || !data.latestDevotional) return;
  const d = data.latestDevotional;
  const a = document.createElement('a');
  a.href = `/devotionals/${encodeURIComponent(d.slug)}`;
  const title = document.createElement('span');
  title.className = 'item-title';
  title.textContent = d.title;
  const meta = document.createElement('span');
  meta.className = 'item-meta';
  meta.textContent = d.date;
  a.append(title, meta);
  slot.replaceChildren(a);
}

async function init() {
  try {
    const res = await fetch('/assets/data/dates.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`dates.json ${res.status}`);
    const data = await res.json();
    const today = todayISO();
    renderScoreboard(data, today);
    renderPlate(data);
    renderLatestDevotional(data);
  } catch (e) {
    console.error('dashboard data failed to load', e);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
