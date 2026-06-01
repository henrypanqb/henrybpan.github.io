import { devotionalStatus, videoStatus, essayStatus } from './scoreboard.js';

const todayISO = () => new Date().toISOString().slice(0, 10);

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
  plate.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = `https://www.youtube.com/embed/${id}?autoplay=1`;
    f.title = data.latestVideo.title || 'video';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.allowFullscreen = true;
    plate.replaceChildren(f);
    plate.classList.add('is-playing');
  }, { once: true });
}

function renderLatestDevotional(data) {
  const slot = document.getElementById('latest-devotional');
  if (!slot || !data.latestDevotional) return;
  const d = data.latestDevotional;
  slot.innerHTML =
    `<a href="/devotionals/${d.slug}"><span class="item-title">${d.title}</span>` +
    `<span class="item-meta">${d.date}</span></a>`;
}

async function init() {
  try {
    const res = await fetch('/assets/data/dates.json', { cache: 'no-cache' });
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
