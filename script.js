'use strict';

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function sanitizeNum(n, min, max) {
  const v = parseInt(n, 10);
  if (isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}
function sanitizeDate(s) {
  if (typeof s !== 'string') return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}
function sanitizeTime(s) {
  if (typeof s !== 'string') return '';
  return /^\d{2}:\d{2}$/.test(s) ? s : '';
}
function getStorage(key, fallback) {
  try { const v = localStorage.getItem(key); if (v === null) return fallback; return JSON.parse(v); } catch { return fallback; }
}
function setStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function showToast(msg, type) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.setAttribute('role','status');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.animation = 'toastOut 0.25s ease forwards'; setTimeout(() => t.remove(), 250); }, 2800);
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function formatDateDisplay(str) {
  if (!str) return '';
  const d = new Date(str + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric', year:'numeric' });
}
function greetingByTime() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function formatTimeTo12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
}

const MOOD_ICONS = ['','sentiment_very_dissatisfied','sentiment_dissatisfied','sentiment_neutral','sentiment_satisfied','sentiment_very_satisfied'];
const MOOD_LABELS = ['','Struggling','Low','Okay','Good','Amazing'];
const MOOD_COLORS = ['','#B3261E','#E8650A','#8B5E00','#186A3B','#6750A4'];

function renderMoodDot(mood) {
  if (!mood) return `<div class="mood-dot mood-dot--empty"><span class="material-icons-round" aria-hidden="true">radio_button_unchecked</span></div>`;
  return `<div class="mood-dot mood-dot--${mood}" title="${sanitize(MOOD_LABELS[mood])}"><span class="material-icons-round" aria-hidden="true">${sanitize(MOOD_ICONS[mood])}</span></div>`;
}

function parseMarkdown(md) {
  if (!md) return '';
  let html = md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const codeBlocks = [];
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    codeBlocks.push(`<pre><code>${code}</code></pre>`);
    return `\n@@CODEBLOCK_${codeBlocks.length - 1}@@\n`;
  });

  html = html
    .replace(/!\[([^\]]*)\]\(data:image[^)]+\)/g, (m, alt, src) => `<img alt="${alt}" src="${m.slice(m.indexOf('(')+1, -1)}">`)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^# (.+)$/gm,'<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/^> (.+)$/gm,'<blockquote>$1</blockquote>')
    .replace(/^---+$/gm,'<hr>')
    .replace(/^\d+\. (.+)$/gm,'<li class="ol-item">$1</li>')
    .replace(/^[-*] (.+)$/gm,'<li class="ul-item">$1</li>');

  html = html.replace(/(<li class="ol-item">.*?<\/li>(\n|$))+/g, m => '<ol>' + m.replace(/ class="ol-item"/g,'') + '</ol>');
  html = html.replace(/(<li class="ul-item">.*?<\/li>(\n|$))+/g, m => '<ul>' + m.replace(/ class="ul-item"/g,'') + '</ul>');

  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (/^<(h[123]|ul|ol|li|blockquote|hr)/.test(trimmed) || trimmed.startsWith('@@CODEBLOCK_')) return line;
    return '<p>' + line + '</p>';
  }).filter(Boolean).join('');

  codeBlocks.forEach((block, idx) => {
    html = html.replace(`<p>@@CODEBLOCK_${idx}@@</p>`, block)
               .replace(`@@CODEBLOCK_${idx}@@`, block);
  });

  return html;
}

function debounce(fn, ms) {
  let t;
  return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
}

function matchesQuery(query, fields) {
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some(f => f && f.toLowerCase().includes(q));
}

/**
 * Stable O(n log n) sort — wraps Array#sort with an index tiebreak so
 * equal elements preserve their original relative order.
 * @param {Array} arr   — array to sort (not mutated; returns a new array)
 * @param {Function} cmp — comparator (a, b) => number
 */
function stableSort(arr, cmp) {
  return arr
    .map((v, i) => ({ v, i }))
    .sort((a, b) => cmp(a.v, b.v) || (a.i - b.i))
    .map(x => x.v);
}

const PRIORITY_ORDER = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

const _notesState  = { query: '', sort: 'date-desc' };
const _journalState = { query: '', sort: 'date-desc' };
const _todoState   = { query: '', sort: 'date-desc' };

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initOnboarding();
  initNavigation();
  initCheckin();
  initJournal();
  initTodo();
  initHabits();
  initCalendar();
  initFlashcards();
  initMusic();
  initPomodoro();
  initWellness();
  initInsights();
  initSettings();
  initDatePicker();
  initTimePicker();
  initHome();
});

function initTheme() {
  const saved = getStorage('theme', 'system');
  applyTheme(saved);
  updateThemeBtns(saved);
}
function applyTheme(t) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = t === 'dark' || (t === 'system' && prefersDark);
  if (isDark) document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.removeAttribute('data-theme');
  setStorage('theme', t);
}
function updateThemeBtns(t) {
  document.querySelectorAll('.theme-opt-btn').forEach(b => {
    const active = b.dataset.theme === t;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
  });
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getStorage('theme','system') === 'system') applyTheme('system');
});

const ONBOARDING_STEPS = [
  {
    icon: 'auto_stories',
    title: 'Welcome to StudyHub',
    body: 'Your all-in-one wellness and study companion. This quick tour highlights the key features.',
    targetSelector: null,
    padding: 0
  },
  {
    icon: 'cottage',
    title: 'Your Dashboard',
    body: 'See today\'s mood, habit progress, and quick actions at a glance every day.',
    targetSelector: '#page-home .page-inner',
    padding: 8
  },
  {
    icon: 'navigation',
    title: 'Navigation',
    body: 'Use the sidebar (desktop) or bottom bar (mobile) to move between all sections of the app.',
    targetSelector: '#sidebar, #bottom-nav',
    padding: 8
  },
  {
    icon: 'sentiment_satisfied',
    title: 'Daily Check-In',
    body: 'Log your mood, energy, and sleep each day to track your emotional wellbeing over time.',
    targetSelector: '#sidebar, #bottom-nav',
    padding: 8
  },
  {
    icon: 'insights',
    title: 'Insights & Wellness',
    body: 'See your progress trends, generate wellness reports, and explore wellness tools — all in one place.',
    targetSelector: '#sidebar, #bottom-nav',
    padding: 8
  }
];

function _obClamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

function _obTarget(selector) {
  if (!selector) return null;
  for (const sel of selector.split(',')) {
    const el = document.querySelector(sel.trim());
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      const cs = window.getComputedStyle(el);
      if (cs.display !== 'none' && cs.visibility !== 'hidden') return el;
    }
  }
  return null;
}

function _obPositionTooltip(tooltip, spotRect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tt = tooltip.getBoundingClientRect();
  const GAP = 14;
  const EDGE = 8;

  let x, y, placement;

  if (spotRect) {
    const belowY = spotRect.bottom + GAP;
    const aboveY = spotRect.top  - GAP - tt.height;
    const rightX = spotRect.right + GAP;
    const leftX  = spotRect.left  - GAP - tt.width;

    if (belowY + tt.height + EDGE <= vh) {
      placement = 'bottom';
      y = belowY;
      x = _obClamp(spotRect.left + (spotRect.width - tt.width) / 2, EDGE, vw - tt.width - EDGE);
    } else if (aboveY >= EDGE) {
      placement = 'top';
      y = aboveY;
      x = _obClamp(spotRect.left + (spotRect.width - tt.width) / 2, EDGE, vw - tt.width - EDGE);
    } else if (rightX + tt.width + EDGE <= vw) {
      placement = 'right';
      x = rightX;
      y = _obClamp(spotRect.top + (spotRect.height - tt.height) / 2, EDGE, vh - tt.height - EDGE);
    } else {
      placement = 'left';
      x = Math.max(EDGE, leftX);
      y = _obClamp(spotRect.top + (spotRect.height - tt.height) / 2, EDGE, vh - tt.height - EDGE);
    }
  } else {
    // Centre of screen (intro / no target)
    placement = 'center';
    x = _obClamp((vw - tt.width)  / 2, EDGE, vw - tt.width  - EDGE);
    y = _obClamp((vh - tt.height) / 2, EDGE, vh - tt.height - EDGE);
  }

  tooltip.style.left = x + 'px';
  tooltip.style.top  = y + 'px';
  tooltip.style.transform = 'none';
  tooltip.dataset.placement = placement;
  return placement;
}

function _obUpdateSpotlight(targetEl, padding) {
  const hole   = document.getElementById('spotlight-hole');
  const svgEl  = document.getElementById('onboarding-mask');
  if (!hole || !svgEl) return null;

  if (!targetEl) {
    // No cutout — solid dim
    hole.setAttribute('width', '0');
    hole.setAttribute('height', '0');
    return null;
  }

  const r   = targetEl.getBoundingClientRect();
  const pad = padding || 0;
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;

  const x   = Math.max(0, r.left   - pad);
  const y   = Math.max(0, r.top    - pad);
  const x2  = Math.min(vw, r.right  + pad);
  const y2  = Math.min(vh, r.bottom + pad);
  const w   = Math.max(0, x2 - x);
  const h   = Math.max(0, y2 - y);

  const cs  = window.getComputedStyle(targetEl);
  const br  = parseFloat(cs.borderRadius) || 0;
  const rx  = Math.min(br + 4, w / 2, h / 2);

  hole.setAttribute('x',  x);
  hole.setAttribute('y',  y);
  hole.setAttribute('width',  w);
  hole.setAttribute('height', h);
  hole.setAttribute('rx', rx);
  hole.setAttribute('ry', rx);

  return { left: x, top: y, right: x + w, bottom: y + h, width: w, height: h };
}

function initOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  const app     = document.getElementById('app');
  if (!overlay) return;

  initOnboarding.restart = launchTour;

  function launchTour() {
    const homeBtn = document.querySelector('[data-page="home"].nav-item') ||
                    document.querySelector('[data-page="home"].bnav-item');
    if (homeBtn) homeBtn.click();

    if (app) app.style.display = 'flex';

    overlay.style.display = '';
    overlay.removeAttribute('aria-hidden');

    const tooltip  = document.getElementById('onboarding-tooltip');
    const titleEl  = document.getElementById('onboarding-tooltip-title');
    const bodyEl   = document.getElementById('onboarding-tooltip-body');
    const iconEl   = document.getElementById('onboarding-tooltip-icon');
    const stepEl   = document.getElementById('onboarding-tooltip-step');
    const dotsEl   = document.getElementById('onboarding-dots');
    const nextBtn  = document.getElementById('onboarding-next');
    const skipBtn  = document.getElementById('onboarding-skip');

    const total = ONBOARDING_STEPS.length;
    let current = 0;
    let resizeTimer;
    let _resizeListener = null;
    let _orientListener = null;
    let _keyListener    = null;

    function detachListeners() {
      if (_keyListener)    { document.removeEventListener('keydown', _keyListener);     _keyListener    = null; }
      if (_resizeListener) { window.removeEventListener('resize', _resizeListener);     _resizeListener = null; }
      if (_orientListener) { window.removeEventListener('orientationchange', _orientListener); _orientListener = null; }
    }

    if (nextBtn) {
      const nb = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(nb, nextBtn);
    }
    if (skipBtn) {
      const sb = skipBtn.cloneNode(true);
      skipBtn.parentNode.replaceChild(sb, skipBtn);
    }
    const freshNext = document.getElementById('onboarding-next');
    const freshSkip = document.getElementById('onboarding-skip');

    dotsEl.innerHTML = ONBOARDING_STEPS.map((_, i) =>
      `<button class="ob-dot${i === 0 ? ' active' : ''}" data-i="${i}"
        role="tab" aria-selected="${i === 0}" aria-label="Step ${i+1} of ${total}"></button>`
    ).join('');

    dotsEl.querySelectorAll('.ob-dot').forEach(dot => {
      dot.addEventListener('click', () => goStep(parseInt(dot.dataset.i)));
    });

    function renderStep(n) {
      const s = ONBOARDING_STEPS[n];

      if (iconEl)  iconEl.textContent  = s.icon;
      if (titleEl) titleEl.textContent = s.title;
      if (bodyEl)  bodyEl.textContent  = s.body;
      if (stepEl)  stepEl.textContent  = `${n + 1} of ${total}`;

      const nb2 = document.getElementById('onboarding-next');
      if (nb2) {
        const isLast = n === total - 1;
        nb2.innerHTML = isLast
          ? `Get Started<span class="material-icons-round" aria-hidden="true">check</span>`
          : `Next<span class="material-icons-round" aria-hidden="true">arrow_forward</span>`;
      }

      dotsEl.querySelectorAll('.ob-dot').forEach((dot, i) => {
        const active = i === n;
        dot.classList.toggle('active', active);
        dot.setAttribute('aria-selected', String(active));
      });

      const tt = document.getElementById('onboarding-tooltip');
      if (tt) {
        tt.style.animation = 'none';
        void tt.offsetWidth;
        tt.style.animation = '';
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const targetEl = _obTarget(s.targetSelector);

          if (targetEl) {
            targetEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
          }

          requestAnimationFrame(() => {
            const spotRect = _obUpdateSpotlight(targetEl, s.padding);
            const tooltip2 = document.getElementById('onboarding-tooltip');
            if (tooltip2) _obPositionTooltip(tooltip2, spotRect);
          });
        });
      });
    }

    function goStep(n) {
      current = n;
      renderStep(n);
    }

    function finish() {
      detachListeners();
      setStorage('onboarding_done', true);
      overlay.style.display = 'none';
      overlay.setAttribute('aria-hidden', 'true');
      const hole = document.getElementById('spotlight-hole');
      if (hole) { hole.setAttribute('width', '0'); hole.setAttribute('height', '0'); }
      if (app) app.style.display = 'flex';
      initHome();
    }

    freshNext && freshNext.addEventListener('click', () => {
      if (current < total - 1) goStep(current + 1);
      else finish();
    });
    freshSkip && freshSkip.addEventListener('click', finish);

    _keyListener = function onKeyDown(e) {
      if (!overlay || overlay.style.display === 'none') return;
      if (e.key === 'Escape') { finish(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); current < total - 1 ? goStep(current + 1) : finish(); }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); if (current > 0) goStep(current - 1); }
    };
    document.addEventListener('keydown', _keyListener);

    _resizeListener = function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const s = ONBOARDING_STEPS[current];
        const targetEl = _obTarget(s.targetSelector);
        const spotRect = _obUpdateSpotlight(targetEl, s.padding);
        _obPositionTooltip(document.getElementById('onboarding-tooltip'), spotRect);
      }, 80);
    };
    _orientListener = _resizeListener;
    window.addEventListener('resize', _resizeListener);
    window.addEventListener('orientationchange', _orientListener);

    requestAnimationFrame(() => {
      renderStep(0);
      requestAnimationFrame(() => {
        const nb3 = document.getElementById('onboarding-next');
        nb3 && nb3.focus();
      });
    });
  }

  const seen = getStorage('onboarding_done', false);
  if (seen) {
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
    if (app) app.style.display = 'flex';
    return;
  }
  launchTour();
}

function initNavigation() {
  const hamburger = document.getElementById('hamburger-btn');
  const drawer = document.getElementById('mobile-drawer');
  const drawerScrim = document.getElementById('drawer-scrim');
  const drawerClose = document.getElementById('drawer-close');

  function openMobileDrawer() {
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false');
    hamburger && hamburger.setAttribute('aria-expanded','true');
    document.body.style.overflow = 'hidden';
    const panel = document.getElementById('drawer-panel'); if (panel) panel.focus();
  }
  window.closeMobileDrawer = function() {
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true');
    hamburger && hamburger.setAttribute('aria-expanded','false');
    document.body.style.overflow = '';
  };

  const backBtn = document.getElementById('top-bar-back-btn');
  backBtn && backBtn.addEventListener('click', () => navigateTo('home'));

  function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item,.bnav-item,.drawer-item').forEach(b => { b.classList.remove('active'); b.removeAttribute('aria-current'); });
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');
    document.querySelectorAll('[data-page="' + page + '"]').forEach(b => {
      b.classList.add('active');
      if (b.classList.contains('nav-item') || b.classList.contains('bnav-item') || b.classList.contains('drawer-item')) {
        b.setAttribute('aria-current','page');
      }
    });
    const titles = { home:'StudyHub', checkin:'Check-In', journal:'Journal', insights:'Insights', wellness:'Wellness', study:'Study', settings:'Settings', about:'About', privacy:'Privacy', credits:'Credits', shop:'Shop' };
    const titleEl = document.getElementById('top-bar-title');
    if (titleEl) titleEl.textContent = titles[page] || 'StudyHub';
    const pageTitleEl = document.getElementById('top-bar-page-title');
    if (pageTitleEl) pageTitleEl.textContent = page === 'home' ? '' : (titles[page] || '');
    document.body.setAttribute('data-current-page', page);
    window.closeMobileDrawer();
    if (page === 'insights') renderInsights();
    if (page === 'home') updateHomeDashboard();
    if (page === 'shop') renderShop();
    window.scrollTo({ top:0, behavior:'smooth' });
  }
  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => { const pg = btn.getAttribute('data-page'); if (pg) navigateTo(pg); });
  });
  hamburger && hamburger.addEventListener('click', openMobileDrawer);
  drawerScrim && drawerScrim.addEventListener('click', window.closeMobileDrawer);
  drawerClose && drawerClose.addEventListener('click', window.closeMobileDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { window.closeMobileDrawer(); closeDatePicker(); closeTimePicker(); } });
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  themeToggleBtn && themeToggleBtn.addEventListener('click', () => {
    const cur = getStorage('theme','system');
    const isDark = cur === 'dark' || (cur === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next = isDark ? 'light' : 'dark';
    applyTheme(next); updateThemeBtns(next);
  });
  navigateTo('home');
}

function initHome() { updateHomeDashboard(); }

function updateHomeDashboard() {
  const name = getStorage('profile_name','');
  const gender = getStorage('profile_gender','male');
  const greetEl = document.getElementById('greeting-name');
  if (greetEl) greetEl.textContent = name || 'Student';
  const labelEl = document.getElementById('greeting-label-text');
  if (labelEl) labelEl.textContent = greetingByTime();
  const mobileTimeEl = document.getElementById('mobile-greeting-time');
  if (mobileTimeEl) mobileTimeEl.textContent = greetingByTime();
  const mobileNameEl = document.getElementById('mobile-greeting-name');
  if (mobileNameEl) mobileNameEl.textContent = name || 'Student';
  const avatarIcon = document.getElementById('avatar-icon');
  if (avatarIcon) avatarIcon.textContent = gender === 'female' ? 'face_3' : 'face';
  const mobileAvatarIcon = document.getElementById('mobile-avatar-icon');
  if (mobileAvatarIcon) mobileAvatarIcon.textContent = gender === 'female' ? 'face_3' : 'face';
  const checkins = getStorage('checkins',[]);
  const today = todayStr();
  const todayCheckin = checkins.find(c => c.date === today);
  const moodDisplay = document.getElementById('home-mood-display');
  if (moodDisplay) moodDisplay.textContent = todayCheckin ? MOOD_LABELS[todayCheckin.mood] : 'Not logged yet';
  const streak = calcCheckinStreak(checkins);
  const streakEl = document.getElementById('home-streak');
  if (streakEl) streakEl.textContent = streak + (streak === 1 ? ' day' : ' days');
  const habits = getStorage('habits',[]);
  let doneToday = 0;
  habits.forEach(h => { if (h.days && h.days[today]) doneToday++; });
  const habitEl = document.getElementById('home-habits-today');
  if (habitEl) habitEl.textContent = doneToday + '/' + habits.length;
  const sessions = getStorage('pomodoro_sessions',[]);
  const focusEl = document.getElementById('home-focus');
  if (focusEl) focusEl.textContent = sessions.filter(s => s.date === today).length + ' today';
  const journals = getStorage('journals',{});
  const entriesEl = document.getElementById('home-entries');
  if (entriesEl) entriesEl.textContent = Object.keys(journals).length;
  renderWeekMoodsHome(checkins);
  renderInsightTeaser(checkins);
}

function calcCheckinStreak(checkins) {
  if (!checkins.length) return 0;
  const dates = [...new Set(checkins.map(c => c.date))].sort().reverse();
  let streak = 0, expected = todayStr();
  for (const d of dates) {
    if (d === expected) { streak++; const dt = new Date(d+'T12:00:00'); dt.setDate(dt.getDate()-1); expected = dt.toISOString().slice(0,10); } else break;
  }
  return streak;
}

function renderWeekMoodsHome(checkins) {
  const el = document.getElementById('week-moods-home');
  if (!el) return;
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate()-i); days.push(d.toISOString().slice(0,10)); }
  el.innerHTML = days.map(date => {
    const c = checkins.find(x => x.date === date);
    const dt = new Date(date+'T12:00:00');
    const label = dt.toLocaleDateString(undefined,{weekday:'short'}).slice(0,2);
    return `<div class="week-mood-item">${renderMoodDot(c ? c.mood : 0)}<span class="mood-day">${sanitize(label)}</span></div>`;
  }).join('');
}

function renderInsightTeaser(checkins) {
  const el = document.getElementById('insight-teaser-content');
  if (!el) return;
  if (checkins.length < 3) {
    el.innerHTML = '<span class="material-icons-round insight-icon" aria-hidden="true">auto_graph</span><p class="insight-placeholder">Complete a few days of check-ins to see your mood insights here.</p>';
    return;
  }
  const last7 = checkins.slice(-7);
  const avg = last7.reduce((s,c) => s+c.mood, 0) / last7.length;
  const avgLabel = MOOD_LABELS[Math.round(avg)] || 'Okay';
  el.innerHTML = `<span class="material-icons-round insight-icon" aria-hidden="true">auto_graph</span><p style="font-size:0.9rem;color:var(--md-on-surface-variant)">Your average mood this week is <strong style="color:var(--md-primary)">${sanitize(avgLabel)}</strong> (${avg.toFixed(1)}/5). Keep checking in daily for better insights.</p>`;
}

function getCurrentWeekDates() {
  const days = [], today = new Date(), day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(today); start.setDate(today.getDate()+diff);
  for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate()+i); days.push(d.toISOString().slice(0,10)); }
  return days;
}

function initCheckin() {
  let selectedMood = 0, selectedEnergy = '', selectedSleep = '';
  const emojiGrid = document.getElementById('mood-emoji-grid');
  const moodLabel = document.getElementById('selected-mood-label');
  const moodSlider = document.getElementById('mood-slider');
  const finetuneGroup = document.getElementById('mood-finetune-group');
  const finetuneZoneLabel = document.getElementById('mood-finetune-zone-label');
  const finetuneCenterLabel = document.getElementById('mood-finetune-center-label');
  const sliderDots = document.getElementById('mood-slider-dots');
  const stressSlider = document.getElementById('stress-slider');
  const thoughts = document.getElementById('checkin-thoughts');
  const thoughtsCount = document.getElementById('thoughts-count');
  const wellnessRow = document.getElementById('wellness-score-row');
  const wellnessValue = document.getElementById('wellness-score-value');
  const wellnessBar = document.getElementById('wellness-score-bar');

  const ZONE_CENTERS = { 1:1, 2:3, 3:5, 4:7, 5:9 };

  function sliderValToMood(val) {
    return Math.ceil(val / 2);
  }

  function updateSliderDots(mood) {
    if (!sliderDots) return;
    sliderDots.innerHTML = [1,2,3,4,5].map(m => {
      const active = m === mood ? ' active' : '';
      return `<span class="msd-dot msd-dot--${m}${active}"></span>`;
    }).join('');
  }

  function updateSliderColor(val) {
    if (!moodSlider) return;
    const pct = ((val - 1) / 9) * 100;
    moodSlider.style.background = `linear-gradient(to right, var(--md-mood-${Math.min(sliderValToMood(val),5)}) ${pct}%, var(--md-secondary-container) ${pct}%)`;
  }

  function syncSliderToMood(mood) {
    const center = ZONE_CENTERS[mood];
    if (moodSlider) { moodSlider.value = center; updateSliderColor(center); }
    if (finetuneGroup) finetuneGroup.style.display = '';
    if (finetuneZoneLabel) finetuneZoneLabel.textContent = '— ' + (MOOD_LABELS[mood] || '');
    if (finetuneCenterLabel) finetuneCenterLabel.textContent = MOOD_LABELS[mood] || '';
    updateSliderDots(mood);
    updateWellnessScore();
  }

  function updateWellnessScore() {
    if (!wellnessRow || !wellnessValue || !wellnessBar) return;
    if (!selectedMood) { wellnessRow.style.display = 'none'; return; }
    const sliderVal = moodSlider ? parseInt(moodSlider.value) : ZONE_CENTERS[selectedMood];
    // Stress slider: 0 = very stressed, 10 = calm — higher is better
    const stressVal = stressSlider ? parseInt(stressSlider.value) : 5;
    const energyScore = { low: 1, medium: 2, high: 3 }[selectedEnergy] || 2;
    const sleepScore = { poor: 1, fair: 2, good: 3, great: 4 }[selectedSleep] || 2;
    // Formula: mood(1-10)×3 + stress(0-10)×2 + energy(1-3)×2 + sleep(1-4)×2 → max=30+20+6+8=64
    const raw = sliderVal * 3 + stressVal * 2 + energyScore * 2 + sleepScore * 2;
    const score = Math.round((raw / 64) * 100);
    wellnessRow.style.display = '';
    wellnessValue.textContent = score + ' / 100';
    wellnessBar.style.width = score + '%';
    const barColor = score >= 70 ? 'var(--md-mood-4)' : score >= 45 ? 'var(--md-mood-3)' : 'var(--md-mood-2)';
    wellnessBar.style.background = barColor;

    function renderDots(filled, max, color) {
      let html = '';
      for (let i = 0; i < max; i++) {
        html += `<span class="wsb-dot${i < filled ? ' filled' : ''}" style="${i < filled ? 'background:' + color : ''}"></span>`;
      }
      return html;
    }
    const moodDots = Math.round(sliderVal / 2);
    const stressDots = Math.round(stressVal / 2);
    const energyDots = energyScore;
    const sleepDots = sleepScore;

    const wsbMood = document.getElementById('wsb-mood');
    const wsbStress = document.getElementById('wsb-stress');
    const wsbEnergy = document.getElementById('wsb-energy');
    const wsbSleep = document.getElementById('wsb-sleep');
    if (wsbMood) wsbMood.innerHTML = renderDots(moodDots, 5, barColor);
    if (wsbStress) wsbStress.innerHTML = renderDots(stressDots, 5, stressDots <= 1 ? 'var(--md-mood-1)' : stressDots <= 3 ? 'var(--md-mood-3)' : 'var(--md-mood-4)');
    if (wsbEnergy) wsbEnergy.innerHTML = renderDots(energyDots, 3, energyDots === 1 ? 'var(--md-mood-2)' : energyDots === 2 ? 'var(--md-mood-3)' : 'var(--md-mood-4)');
    if (wsbSleep) wsbSleep.innerHTML = renderDots(sleepDots, 4, sleepDots <= 1 ? 'var(--md-mood-2)' : sleepDots <= 2 ? 'var(--md-mood-3)' : 'var(--md-mood-4)');
  }

  emojiGrid && emojiGrid.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      emojiGrid.querySelectorAll('.mood-btn').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('selected'); btn.setAttribute('aria-pressed','true');
      selectedMood = parseInt(btn.dataset.mood);
      if (moodLabel) moodLabel.textContent = btn.dataset.label;
      syncSliderToMood(selectedMood);
    });
  });

  moodSlider && moodSlider.addEventListener('input', () => {
    const val = parseInt(moodSlider.value);
    const newMood = sliderValToMood(val);
    updateSliderColor(val);
    updateSliderDots(newMood);
    // Sync emoji if zone changed
    if (newMood !== selectedMood && newMood >= 1 && newMood <= 5) {
      selectedMood = newMood;
      if (moodLabel) moodLabel.textContent = MOOD_LABELS[selectedMood];
      if (finetuneZoneLabel) finetuneZoneLabel.textContent = '— ' + MOOD_LABELS[selectedMood];
      if (finetuneCenterLabel) finetuneCenterLabel.textContent = MOOD_LABELS[selectedMood];
      emojiGrid && emojiGrid.querySelectorAll('.mood-btn').forEach(b => {
        const active = parseInt(b.dataset.mood) === selectedMood;
        b.classList.toggle('selected', active);
        b.setAttribute('aria-pressed', String(active));
      });
    }
    updateWellnessScore();
  });

  thoughts && thoughts.addEventListener('input', () => { if (thoughtsCount) thoughtsCount.textContent = thoughts.value.length + ' / 500'; });

  document.querySelectorAll('[data-energy]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-energy]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed','true'); selectedEnergy = btn.dataset.energy;
      updateWellnessScore();
    });
  });
  document.querySelectorAll('[data-sleep]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-sleep]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed','true'); selectedSleep = btn.dataset.sleep;
      updateWellnessScore();
    });
  });
  stressSlider && stressSlider.addEventListener('input', () => {
    const val = parseInt(stressSlider.value);
    const pct = (val / 10) * 100;
    // val=0 very stressed (red), val=5 moderate (amber), val=10 calm (green)
    const color = val <= 3 ? 'var(--md-mood-1)' : val <= 6 ? 'var(--md-mood-3)' : 'var(--md-mood-4)';
    stressSlider.style.background = `linear-gradient(to right, ${color} ${pct}%, var(--md-secondary-container) ${pct}%)`;
    updateWellnessScore();
  });
  // Init stress slider color at midpoint (moderate)
  if (stressSlider) { stressSlider.style.background = `linear-gradient(to right, var(--md-mood-3) 50%, var(--md-secondary-container) 50%)`; }

  const saveBtn = document.getElementById('save-checkin');

  function applyCheckinLock() {
    const checkins = getStorage('checkins', []);
    const alreadyDone = checkins.some(c => c.date === todayStr());
    if (!saveBtn) return;

    const existingBanner = document.getElementById('checkin-done-banner');
    if (existingBanner) existingBanner.remove();

    if (alreadyDone) {
      saveBtn.disabled = true;
      saveBtn.setAttribute('aria-disabled', 'true');
      saveBtn.innerHTML = '<span class="material-icons-round" aria-hidden="true">check_circle</span>Already checked in today';

      const banner = document.createElement('div');
      banner.id = 'checkin-done-banner';
      banner.className = 'checkin-done-banner';
      banner.setAttribute('role', 'status');
      banner.innerHTML = `
        <span class="material-icons-round checkin-done-icon" aria-hidden="true">check_circle</span>
        <div>
          <strong>You've already checked in today!</strong>
          <p>Come back tomorrow to log your next check-in. Keep the streak going!</p>
        </div>`;
      saveBtn.parentNode.insertBefore(banner, saveBtn);
    } else {
      saveBtn.disabled = false;
      saveBtn.removeAttribute('aria-disabled');
      saveBtn.innerHTML = '<span class="material-icons-round" aria-hidden="true">save</span>Save Check-In';
    }
  }

  applyCheckinLock();

  saveBtn && saveBtn.addEventListener('click', () => {
    const checkins0 = getStorage('checkins', []);
    if (checkins0.some(c => c.date === todayStr())) {
      showToast('You\'ve already checked in today. Come back tomorrow!', 'error');
      return;
    }
    if (!selectedMood) { showToast('Please select a mood first.', 'error'); return; }
    const stressVal = stressSlider ? sanitizeNum(stressSlider.value, 0, 10) : 5;
    const sliderVal = moodSlider ? sanitizeNum(moodSlider.value, 1, 10) : ZONE_CENTERS[selectedMood];
    const energyScore = { low: 1, medium: 2, high: 3 }[selectedEnergy] || 2;
    const sleepScore = { poor: 1, fair: 2, good: 3, great: 4 }[selectedSleep] || 2;
    const raw = sliderVal * 3 + stressVal * 2 + energyScore * 2 + sleepScore * 2;
    const wellnessScore = Math.round((raw / 64) * 100);
    const entry = {
      date: todayStr(), mood: sanitizeNum(selectedMood, 1, 5),
      moodSlider: sliderVal,
      stress: stressVal,
      energy: ['low','medium','high'].includes(selectedEnergy) ? selectedEnergy : '',
      sleep: ['poor','fair','good','great'].includes(selectedSleep) ? selectedSleep : '',
      thoughts: thoughts ? thoughts.value.trim().slice(0, 500) : '',
      wellnessScore,
      timestamp: Date.now()
    };
    let checkins = getStorage('checkins', []);
    checkins.push(entry);
    setStorage('checkins', checkins);
    addCoins(10, 'Daily Check-In');
    showToast('Check-in saved! Great job keeping your streak!', 'success');
    emojiGrid && emojiGrid.querySelectorAll('.mood-btn').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed','false'); });
    selectedMood = 0; selectedEnergy = ''; selectedSleep = '';
    document.querySelectorAll('[data-energy]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
    document.querySelectorAll('[data-sleep]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
    if (moodLabel) moodLabel.textContent = '';
    if (finetuneGroup) finetuneGroup.style.display = 'none';
    if (wellnessRow) wellnessRow.style.display = 'none';
    if (thoughts) thoughts.value = '';
    if (thoughtsCount) thoughtsCount.textContent = '0 / 500';
    if (moodSlider) { moodSlider.value = 5; moodSlider.style.background = ''; }
    if (stressSlider) { stressSlider.value = 5; stressSlider.style.background = `linear-gradient(to right, var(--md-mood-3) 50%, var(--md-secondary-container) 50%)`; }
    renderCheckinHistory(); updateHomeDashboard();
    applyCheckinLock();
  });
  renderCheckinHistory();
}

function renderCheckinHistory() {
  const el = document.getElementById('checkin-history');
  if (!el) return;
  const checkins = getStorage('checkins',[]).slice(-10).reverse();
  if (!checkins.length) { el.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:0.875rem;">No check-ins yet. Start your first one above!</p>'; return; }
  el.innerHTML = checkins.map(c => `
    <div class="checkin-item">
      <div class="checkin-emoji">${renderMoodDot(c.mood)}</div>
      <div class="checkin-info">
        <div class="checkin-date">${sanitize(formatDateDisplay(c.date))}</div>
        <div class="checkin-mood-name">${sanitize(MOOD_LABELS[c.mood]||'')}</div>
        ${c.thoughts ? `<div class="checkin-thoughts">${sanitize(c.thoughts.slice(0,80))}${c.thoughts.length>80?'…':''}</div>` : ''}
      </div>
    </div>`).join('');
}

let notesDraftTimer = null, journalDraftTimer = null;

function initJournal() {
  const tabs = document.querySelectorAll('.tab[data-tab]');
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      tabs.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      t.classList.add('active'); t.setAttribute('aria-selected','true');
      const panel = document.getElementById('tab-' + t.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });
  initNotesEditor();
  initJournalEditor();
}

function setDraftStatus(el, state) {
  if (!el) return;
  el.className = 'draft-status';
  if (state === 'saving') { el.className += ' saving'; el.textContent = 'Saving draft…'; }
  else if (state === 'saved') { el.className += ' saved'; el.textContent = 'Draft saved · ' + new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }
  else if (state === 'draft') { el.textContent = 'Unsaved draft restored'; }
  else { el.textContent = ''; }
}

function applyMarkdown(textarea, type) {
  if (!textarea) return;
  const start = textarea.selectionStart, end = textarea.selectionEnd;
  const sel = textarea.value.slice(start, end);
  const before = textarea.value.slice(0, start), after = textarea.value.slice(end);
  let insert = '';
  switch(type) {
    case 'bold': insert = `**${sel||'bold text'}**`; break;
    case 'italic': insert = `*${sel||'italic text'}*`; break;
    case 'heading': insert = `\n## ${sel||'Heading'}\n`; break;
    case 'ul': insert = `\n- ${sel||'List item'}\n`; break;
    case 'ol': insert = `\n1. ${sel||'List item'}\n`; break;
    case 'code': insert = sel.includes('\n') ? `\`\`\`\n${sel||'code'}\n\`\`\`` : `\`${sel||'code'}\``; break;
    case 'link': insert = `[${sel||'link text'}](https://)`; break;
    case 'image': insert = `![${sel||'alt text'}](https://)`; break;
    default: insert = sel;
  }
  textarea.value = before + insert + after;
  textarea.focus();
  textarea.dispatchEvent(new Event('input'));
}

function insertAtCursor(textarea, text) {
  if (!textarea) return;
  const start = textarea.selectionStart;
  textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(textarea.selectionEnd);
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.dispatchEvent(new Event('input'));
}

function setEditorMode(textarea, preview, container, mode, editBtn, prevBtn, splitBtn) {
  [editBtn, prevBtn, splitBtn].forEach(b => { if (b) { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); } });
  container.classList.remove('split-mode');
  if (mode === 'edit') {
    if (editBtn) { editBtn.classList.add('active'); editBtn.setAttribute('aria-pressed','true'); }
    if (textarea) textarea.style.display = '';
    if (preview) preview.style.display = 'none';
  } else if (mode === 'preview') {
    if (prevBtn) { prevBtn.classList.add('active'); prevBtn.setAttribute('aria-pressed','true'); }
    if (preview) { preview.innerHTML = parseMarkdown(textarea ? textarea.value : ''); preview.style.display = ''; }
    if (textarea) textarea.style.display = 'none';
  } else {
    if (splitBtn) { splitBtn.classList.add('active'); splitBtn.setAttribute('aria-pressed','true'); }
    container.classList.add('split-mode');
    if (textarea) textarea.style.display = '';
    if (preview) { preview.innerHTML = parseMarkdown(textarea ? textarea.value : ''); preview.style.display = ''; }
  }
}

function initNotesEditor() {
  const textarea = document.getElementById('notes-input');
  const preview = document.getElementById('notes-preview');
  const container = document.getElementById('notes-editor-container');
  const draftStatus = document.getElementById('notes-draft-status');
  const draft = getStorage('notes_draft','');
  if (draft && textarea) { textarea.value = draft; setDraftStatus(draftStatus,'draft'); }

  let _editingNoteIndex = -1;
  let _editingNoteOriginal = null;

  function _notesHasChanges() {
    if (_editingNoteOriginal === null) return false;
    const labelInput = document.getElementById('note-label-input');
    const reminderHidden = document.getElementById('note-reminder-date');
    return (
      (textarea ? textarea.value : '') !== _editingNoteOriginal.content ||
      (labelInput ? labelInput.value : '') !== _editingNoteOriginal.labels ||
      (reminderHidden ? reminderHidden.value : '') !== (_editingNoteOriginal.reminder || '')
    );
  }

  function _notesSetEditMode(index, note) {
    _editingNoteIndex = index;
    _editingNoteOriginal = {
      content: note.content,
      labels: (note.labels || []).join(', '),
      reminder: note.reminder || '',
      _fullNote: note
    };
    const cancelBtn = document.getElementById('cancel-note-edit');
    if (cancelBtn) cancelBtn.style.display = '';
  }

  function _notesClearEditMode() {
    _editingNoteIndex = -1;
    _editingNoteOriginal = null;
    const cancelBtn = document.getElementById('cancel-note-edit');
    if (cancelBtn) cancelBtn.style.display = 'none';
  }

  textarea && textarea.addEventListener('input', () => {
    setDraftStatus(draftStatus,'saving');
    clearTimeout(notesDraftTimer);
    notesDraftTimer = setTimeout(() => {
      setStorage('notes_draft', textarea.value);
      setDraftStatus(draftStatus,'saved');
      if (container.classList.contains('split-mode') || (preview && preview.style.display !== 'none'))
        preview.innerHTML = parseMarkdown(textarea.value);
    }, 800);
  });
  const editBtn = document.getElementById('notes-edit-mode-btn');
  const prevBtn = document.getElementById('notes-preview-mode-btn');
  const splitBtn = document.getElementById('notes-split-mode-btn');
  editBtn && editBtn.addEventListener('click', () => setEditorMode(textarea, preview, container, 'edit', editBtn, prevBtn, splitBtn));
  prevBtn && prevBtn.addEventListener('click', () => setEditorMode(textarea, preview, container, 'preview', editBtn, prevBtn, splitBtn));
  splitBtn && splitBtn.addEventListener('click', () => setEditorMode(textarea, preview, container, 'split', editBtn, prevBtn, splitBtn));
  document.querySelectorAll('#tab-notes .toolbar-btn[data-md]').forEach(btn => btn.addEventListener('click', () => applyMarkdown(textarea, btn.dataset.md)));
  const imgUpload = document.getElementById('notes-img-upload');
  imgUpload && imgUpload.addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { insertAtCursor(textarea, `\n![${sanitize(file.name)}](${ev.target.result})\n`); setStorage('notes_draft', textarea.value); if (preview && preview.style.display !== 'none') preview.innerHTML = parseMarkdown(textarea.value); };
    reader.readAsDataURL(file); imgUpload.value = '';
  });

  // Reminder date picker for Notes
  const noteReminderTrigger = document.getElementById('note-reminder-date-trigger');
  const noteReminderDisplay = document.getElementById('note-reminder-display');
  const noteReminderHidden = document.getElementById('note-reminder-date');
  noteReminderTrigger && noteReminderTrigger.addEventListener('click', () => {
    openDatePicker(noteReminderHidden && noteReminderHidden.value ? noteReminderHidden.value : todayStr(), picked => {
      if (noteReminderHidden) noteReminderHidden.value = picked;
      if (noteReminderDisplay) noteReminderDisplay.value = formatDateDisplay(picked);
    });
  });

  const saveNote = document.getElementById('save-note');
  saveNote && saveNote.addEventListener('click', () => {
    if (!textarea || !textarea.value.trim()) { showToast('Nothing to save.', 'error'); return; }
    const notes = getStorage('notes',[]);
    const labelInput = document.getElementById('note-label-input');
    const labels = labelInput ? labelInput.value.split(',').map(l => l.trim().slice(0,30)).filter(Boolean).slice(0,8) : [];
    const reminderVal = noteReminderHidden ? sanitizeDate(noteReminderHidden.value) : '';
    if (_editingNoteIndex >= 0 && _editingNoteIndex < notes.length) {
      const existing = notes[_editingNoteIndex];
      notes[_editingNoteIndex] = Object.assign({}, existing, {
        content: textarea.value.trim().slice(0,10000),
        labels,
        reminder: reminderVal || undefined,
        editedAt: Date.now()
      });
      if (!reminderVal) delete notes[_editingNoteIndex].reminder;
    } else {
      const newNote = { content: textarea.value.trim().slice(0,10000), date: todayStr(), timestamp: Date.now(), id: Date.now() + Math.random(), labels };
      if (reminderVal) newNote.reminder = reminderVal;
      notes.unshift(newNote);
    }
    if (reminderVal) scheduleNoteReminder(reminderVal, textarea.value.trim().slice(0,60));
    if (labelInput) labelInput.value = '';
    if (noteReminderDisplay) noteReminderDisplay.value = '';
    if (noteReminderHidden) noteReminderHidden.value = '';
    setStorage('notes', notes.slice(0,200));
    setStorage('notes_draft','');
    textarea.value = '';
    if (preview) preview.innerHTML = '';
    setDraftStatus(draftStatus,'');
    _notesClearEditMode();
    renderNotesList();
    showToast('Note saved!', 'success');
  });

  const cancelNoteEdit = document.getElementById('cancel-note-edit');
  cancelNoteEdit && cancelNoteEdit.addEventListener('click', () => {
    if (_notesHasChanges()) {
      if (!confirm('Discard changes to this note?')) return;
    }
    if (_editingNoteIndex >= 0 && _editingNoteOriginal) {
      const notes = getStorage('notes',[]);
      const restored = _editingNoteOriginal._fullNote || { content: _editingNoteOriginal.content, labels: _editingNoteOriginal.labels ? _editingNoteOriginal.labels.split(',').map(l=>l.trim()).filter(Boolean) : [], reminder: _editingNoteOriginal.reminder || undefined, date: todayStr(), timestamp: Date.now(), id: Date.now() + Math.random() };
      const insertAt = Math.min(_editingNoteIndex, notes.length);
      notes.splice(insertAt, 0, restored);
      setStorage('notes', notes.slice(0,200));
    }
    textarea && (textarea.value = '');
    if (preview) preview.innerHTML = '';
    const labelInput = document.getElementById('note-label-input');
    if (labelInput) labelInput.value = '';
    if (noteReminderDisplay) noteReminderDisplay.value = '';
    if (noteReminderHidden) noteReminderHidden.value = '';
    setStorage('notes_draft','');
    setDraftStatus(draftStatus,'');
    _notesClearEditMode();
    renderNotesList();
  });

  initNotesEditor._setEditMode = _notesSetEditMode;
  initNotesEditor._clearEditMode = _notesClearEditMode;

  const notesSearch = document.getElementById('notes-search');
  const notesSort = document.getElementById('notes-sort');
  if (notesSearch) {
    const onSearch = debounce(() => { _notesState.query = notesSearch.value.trim(); renderNotesList(); }, 250);
    notesSearch.addEventListener('input', onSearch);
    notesSearch.addEventListener('search', onSearch);
  }
  if (notesSort) {
    notesSort.value = _notesState.sort;
    notesSort.addEventListener('change', () => { _notesState.sort = notesSort.value; renderNotesList(); });
  }

  renderNotesList();
}

function initJournalEditor() {
  const textarea = document.getElementById('journal-entry');
  const preview = document.getElementById('journal-preview');
  const container = document.getElementById('journal-editor-container');
  const draftStatus = document.getElementById('journal-draft-status');
  const journalCount = document.getElementById('journal-count');
  const journalDateDisplay = document.getElementById('journal-date');
  const journalDateHidden = document.getElementById('journal-date-value');

  let _editingJournalDate = null;
  let _editingJournalOriginal = null;

  function _journalHasChanges() {
    if (_editingJournalOriginal === null) return false;
    const jLabelInput = document.getElementById('journal-label-input');
    return (
      (textarea ? textarea.value : '') !== _editingJournalOriginal.content ||
      (jLabelInput ? jLabelInput.value : '') !== _editingJournalOriginal.labels
    );
  }

  function _journalSetEditMode(date, content, labels) {
    _editingJournalDate = date;
    _editingJournalOriginal = { content, labels };
    const cancelBtn = document.getElementById('cancel-journal-edit');
    if (cancelBtn) cancelBtn.style.display = '';
  }

  function _journalClearEditMode() {
    _editingJournalDate = null;
    _editingJournalOriginal = null;
    const cancelBtn = document.getElementById('cancel-journal-edit');
    if (cancelBtn) cancelBtn.style.display = 'none';
  }

  function setJournalDate(val) {
    if (journalDateDisplay) journalDateDisplay.value = val ? formatDateDisplay(val) : '';
    if (journalDateHidden) journalDateHidden.value = val || '';
    const journalMeta = getStorage('journal_meta', {});
    const meta = journalMeta[val] || {};
    const jLabelInput = document.getElementById('journal-label-input');
    if (jLabelInput) jLabelInput.value = (meta.labels || []).join(', ');
    loadJournalEntry(val);
    _journalClearEditMode();
  }
  setJournalDate(todayStr());
  const dateOpenFn = () => {
    const cur = (journalDateHidden && journalDateHidden.value) || todayStr();
    openDatePicker(cur, (picked) => setJournalDate(picked));
  };
  document.getElementById('journal-date-trigger') && document.getElementById('journal-date-trigger').addEventListener('click', dateOpenFn);
  journalDateDisplay && journalDateDisplay.addEventListener('click', dateOpenFn);
  textarea && textarea.addEventListener('input', () => {
    if (journalCount) journalCount.textContent = textarea.value.length + ' / 10000';
    setDraftStatus(draftStatus,'saving');
    clearTimeout(journalDraftTimer);
    const dateKey = (journalDateHidden && journalDateHidden.value) || todayStr();
    journalDraftTimer = setTimeout(() => {
      setStorage('journal_draft_' + dateKey, textarea.value);
      setDraftStatus(draftStatus,'saved');
      if (container.classList.contains('split-mode') || (preview && preview.style.display !== 'none'))
        preview.innerHTML = parseMarkdown(textarea.value);
    }, 800);
  });
  const editBtn = document.getElementById('journal-edit-mode-btn');
  const prevBtn = document.getElementById('journal-preview-mode-btn');
  const splitBtn = document.getElementById('journal-split-mode-btn');
  editBtn && editBtn.addEventListener('click', () => setEditorMode(textarea, preview, container, 'edit', editBtn, prevBtn, splitBtn));
  prevBtn && prevBtn.addEventListener('click', () => setEditorMode(textarea, preview, container, 'preview', editBtn, prevBtn, splitBtn));
  splitBtn && splitBtn.addEventListener('click', () => setEditorMode(textarea, preview, container, 'split', editBtn, prevBtn, splitBtn));
  document.querySelectorAll('#tab-journal .toolbar-btn[data-md]').forEach(btn => btn.addEventListener('click', () => applyMarkdown(textarea, btn.dataset.md)));
  const jImgUpload = document.getElementById('journal-img-upload');
  jImgUpload && jImgUpload.addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      insertAtCursor(textarea, `\n![${sanitize(file.name)}](${ev.target.result})\n`);
      const dateKey = (journalDateHidden && journalDateHidden.value) || todayStr();
      setStorage('journal_draft_' + dateKey, textarea.value);
      if (preview && preview.style.display !== 'none') preview.innerHTML = parseMarkdown(textarea.value);
    };
    reader.readAsDataURL(file); jImgUpload.value = '';
  });
  const saveJournal = document.getElementById('save-journal');
  saveJournal && saveJournal.addEventListener('click', () => {
    const date = sanitizeDate((journalDateHidden && journalDateHidden.value) || todayStr()) || todayStr();
    const text = textarea ? textarea.value.trim().slice(0,10000) : '';
    if (!text) { showToast('Write something first!', 'error'); return; }
    const journals = getStorage('journals',{});
    journals[date] = text;
    setStorage('journals', journals);
    addCoins(8, 'Journal Entry');
    const jLabelInput = document.getElementById('journal-label-input');
    const journalMeta = getStorage('journal_meta', {});
    if (!journalMeta[date]) journalMeta[date] = {};
    const jLabels = jLabelInput ? jLabelInput.value.split(',').map(l => l.trim().slice(0,30)).filter(Boolean).slice(0,8) : [];
    journalMeta[date].labels = jLabels;
    setStorage('journal_meta', journalMeta);
    if (jLabelInput) jLabelInput.value = '';
    try { localStorage.removeItem('journal_draft_' + date); } catch {}
    setDraftStatus(draftStatus,'');
    _journalClearEditMode();
    showToast('Journal entry saved!', 'success');
    renderJournalHistory(); updateHomeDashboard();
  });

  const cancelJournalEdit = document.getElementById('cancel-journal-edit');
  cancelJournalEdit && cancelJournalEdit.addEventListener('click', () => {
    if (_journalHasChanges()) {
      if (!confirm('Discard changes to this journal entry?')) return;
    }
    if (_editingJournalDate && _editingJournalOriginal) {
      if (textarea) { textarea.value = _editingJournalOriginal.content; if (journalCount) journalCount.textContent = textarea.value.length + ' / 10000'; }
      const jLabelInput = document.getElementById('journal-label-input');
      if (jLabelInput) jLabelInput.value = _editingJournalOriginal.labels;
    } else {
      if (textarea) { textarea.value = ''; if (journalCount) journalCount.textContent = '0 / 10000'; }
      const jLabelInput = document.getElementById('journal-label-input');
      if (jLabelInput) jLabelInput.value = '';
    }
    setDraftStatus(draftStatus,'');
    _journalClearEditMode();
  });

  initJournalEditor._setEditMode = _journalSetEditMode;

  const journalSearch = document.getElementById('journal-search');
  const journalSort = document.getElementById('journal-sort');
  if (journalSearch) {
    const onSearch = debounce(() => { _journalState.query = journalSearch.value.trim(); renderJournalHistory(); }, 250);
    journalSearch.addEventListener('input', onSearch);
    journalSearch.addEventListener('search', onSearch);
  }
  if (journalSort) {
    journalSort.value = _journalState.sort;
    journalSort.addEventListener('change', () => { _journalState.sort = journalSort.value; renderJournalHistory(); });
  }

  renderJournalHistory();
}

function loadJournalEntry(date) {
  const textarea = document.getElementById('journal-entry');
  const journalCount = document.getElementById('journal-count');
  const draftStatus = document.getElementById('journal-draft-status');
  if (!textarea) return;
  const d = sanitizeDate(date) || todayStr();
  const journals = getStorage('journals',{});
  const draft = getStorage('journal_draft_' + d, null);
  if (draft !== null && draft !== (journals[d] || '')) { textarea.value = draft; setDraftStatus(draftStatus,'draft'); }
  else { textarea.value = journals[d] || ''; setDraftStatus(draftStatus,''); }
  if (journalCount) journalCount.textContent = textarea.value.length + ' / 10000';
}

function renderNotesList() {
  const el = document.getElementById('notes-list');
  if (!el) return;
  const allNotes = getStorage('notes',[]);

  const { query, sort } = _notesState;
  let notes = allNotes.filter((n, origIdx) => {
    n._origIdx = origIdx; // preserve storage index for edit/delete
    return matchesQuery(query, [n.content, ...(n.labels || [])]);
  });

  notes = stableSort(notes, (a, b) => {
    switch (sort) {
      case 'date-asc':   return (a.timestamp || 0) - (b.timestamp || 0);
      case 'alpha-asc':  return a.content.localeCompare(b.content);
      case 'alpha-desc': return b.content.localeCompare(a.content);
      default:           return (b.timestamp || 0) - (a.timestamp || 0); // date-desc
    }
  });

  if (!notes.length) {
    el.innerHTML = `<p class="search-no-results">${allNotes.length ? 'No notes match your search.' : 'No notes yet.'}</p>`;
    return;
  }

  el.innerHTML = notes.map((n) => {
    const i = n._origIdx;
    return `
    <div class="note-item" data-id="${sanitize(String(n.id))}">
      <div class="note-item-header">
        <div class="note-item-meta">${sanitize(formatDateDisplay(n.date))}</div>
        <div class="note-item-actions">
          <button class="note-edit-btn" data-i="${i}" aria-label="Edit note" title="Edit"><span class="material-icons-round" aria-hidden="true">edit</span></button>
          <button class="note-delete" data-i="${i}" aria-label="Delete note" title="Delete"><span class="material-icons-round" aria-hidden="true">delete</span></button>
        </div>
      </div>
      ${n.labels && n.labels.length ? `<div class="item-labels">${n.labels.map(l=>`<span class="item-label"><span class="material-icons-round" aria-hidden="true" style="font-size:0.75rem;vertical-align:middle">label</span> ${sanitize(l)}</span>`).join('')}</div>` : ''}
      ${n.reminder ? `<div class="item-reminder"><span class="material-icons-round" aria-hidden="true" style="font-size:0.95rem">alarm</span>${sanitize(formatDateDisplay(n.reminder))}</div>` : ''}
      <div class="note-item-content md-preview">${parseMarkdown(n.content)}</div>
    </div>`;
  }).join('');

  el.querySelectorAll('.note-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const notes = getStorage('notes',[]);
      const idx = parseInt(btn.dataset.i);
      const n = notes[idx];
      if (!n) return;
      const textarea = document.getElementById('notes-input');
      const labelInput = document.getElementById('note-label-input');
      const noteReminderDisplay = document.getElementById('note-reminder-display');
      const noteReminderHidden = document.getElementById('note-reminder-date');
      if (textarea) { textarea.value = n.content; textarea.dispatchEvent(new Event('input')); }
      if (labelInput) labelInput.value = (n.labels || []).join(', ');
      if (n.reminder) {
        if (noteReminderHidden) noteReminderHidden.value = n.reminder;
        if (noteReminderDisplay) noteReminderDisplay.value = formatDateDisplay(n.reminder);
      } else {
        if (noteReminderHidden) noteReminderHidden.value = '';
        if (noteReminderDisplay) noteReminderDisplay.value = '';
      }
      if (initNotesEditor._setEditMode) initNotesEditor._setEditMode(idx, n);
      notes.splice(idx, 1);
      setStorage('notes', notes);
      renderNotesList();
      const tab = document.querySelector('.tab[data-tab="notes"]'); if (tab) tab.click();
      textarea && textarea.scrollIntoView({behavior:'smooth'});
    });
  });
  el.querySelectorAll('.note-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this note?')) return;
      const notes = getStorage('notes',[]); notes.splice(parseInt(btn.dataset.i), 1);
      setStorage('notes', notes); renderNotesList();
    });
  });
}

function renderJournalHistory() {
  const el = document.getElementById('journal-history');
  if (!el) return;
  const journals = getStorage('journals',{});
  const journalMeta = getStorage('journal_meta', {});

  const allEntries = Object.entries(journals).map(([date, text]) => {
    const meta = journalMeta[date] || {};
    return { date, text, labels: meta.labels || [], reminder: meta.reminder || '' };
  });

  const { query, sort } = _journalState;
  let entries = allEntries.filter(e =>
    matchesQuery(query, [e.text, e.date, ...e.labels])
  );

  entries = stableSort(entries, (a, b) => {
    switch (sort) {
      case 'date-asc':   return a.date.localeCompare(b.date);
      case 'alpha-asc':  return a.text.localeCompare(b.text);
      case 'alpha-desc': return b.text.localeCompare(a.text);
      default:           return b.date.localeCompare(a.date); // date-desc
    }
  });

  entries = entries.slice(0, 20);

  if (!entries.length) {
    el.innerHTML = `<p class="search-no-results">${allEntries.length ? 'No entries match your search.' : 'No journal entries yet.'}</p>`;
    return;
  }

  el.innerHTML = entries.map(({ date, text, labels, reminder }) => `
    <div class="journal-item" role="article">
      <div class="journal-item-header">
        <div class="journal-item-date">${sanitize(formatDateDisplay(date))}</div>
        <div class="journal-item-actions">
          <button class="journal-action-btn edit" data-date="${sanitize(date)}" aria-label="Edit entry" title="Edit"><span class="material-icons-round" aria-hidden="true">edit</span></button>
          <button class="journal-action-btn del" data-date="${sanitize(date)}" aria-label="Delete entry" title="Delete"><span class="material-icons-round" aria-hidden="true">delete</span></button>
        </div>
      </div>
      ${labels.length ? `<div class="item-labels">${labels.map(l=>`<span class="item-label"><span class="material-icons-round" aria-hidden="true" style="font-size:0.75rem;vertical-align:middle">label</span> ${sanitize(l)}</span>`).join('')}</div>` : ''}
      ${reminder ? `<div class="item-reminder"><span class="material-icons-round" aria-hidden="true" style="font-size:0.95rem">alarm</span>${sanitize(formatDateDisplay(reminder))}</div>` : ''}
      <div class="journal-item-preview">${sanitize(text.slice(0,150))}${text.length>150?'…':''}</div>
    </div>`).join('');

  el.querySelectorAll('.journal-action-btn.edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const date = btn.dataset.date;
      const dd = document.getElementById('journal-date'); if (dd) dd.value = formatDateDisplay(date);
      const dh = document.getElementById('journal-date-value'); if (dh) dh.value = date;
      const journalMeta = getStorage('journal_meta', {});
      const meta = journalMeta[date] || {};
      const jLabelInput = document.getElementById('journal-label-input');
      if (jLabelInput) jLabelInput.value = (meta.labels || []).join(', ');
      loadJournalEntry(date);
      const journals = getStorage('journals', {});
      if (initJournalEditor._setEditMode) {
        initJournalEditor._setEditMode(date, journals[date] || '', (meta.labels || []).join(', '));
      }
      const jTab = document.querySelector('.tab[data-tab="journal"]'); if (jTab) jTab.click();
      const je = document.getElementById('journal-entry'); if (je) je.scrollIntoView({behavior:'smooth'});
    });
  });
  el.querySelectorAll('.journal-action-btn.del').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this journal entry?')) return;
      const journals = getStorage('journals',{}); delete journals[btn.dataset.date];
      setStorage('journals', journals);
      renderJournalHistory(); updateHomeDashboard();
      showToast('Entry deleted.','');
    });
  });
}

function initTodo() {
  const todoInput = document.getElementById('todo-input');
  todoInput && todoInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { document.getElementById('add-todo') && document.getElementById('add-todo').click(); }
  });
  const todoAllDay = document.getElementById('todo-allday');
  const todoTimeDisplay = document.getElementById('todo-time-display');
  const todoTimeHidden = document.getElementById('todo-time');
  todoAllDay && todoAllDay.addEventListener('change', () => {
    const fg = todoTimeDisplay ? todoTimeDisplay.closest('.field-group') : null;
    if (fg) fg.style.opacity = todoAllDay.checked ? '0.4' : '';
    if (todoAllDay.checked) { if (todoTimeDisplay) todoTimeDisplay.value = ''; if (todoTimeHidden) todoTimeHidden.value = ''; }
  });
  const todoDTrigger = document.getElementById('todo-date-trigger');
  const todoDDisplay = document.getElementById('todo-date-display');
  const todoDHidden = document.getElementById('todo-date');
  const openTodoDate = () => openDatePicker((todoDHidden && todoDHidden.value) || todayStr(), picked => { if (todoDHidden) todoDHidden.value = picked; if (todoDDisplay) todoDDisplay.value = formatDateDisplay(picked); });
  todoDTrigger && todoDTrigger.addEventListener('click', openTodoDate);
  todoDDisplay && todoDDisplay.addEventListener('click', openTodoDate);
  const todoTTrigger = document.getElementById('todo-time-trigger');
  todoTTrigger && todoTTrigger.addEventListener('click', () => openTimePicker((todoTimeHidden && todoTimeHidden.value) || '', picked => { if (todoTimeHidden) todoTimeHidden.value = picked; if (todoTimeDisplay) todoTimeDisplay.value = formatTimeTo12(picked); }));
  document.getElementById('add-todo') && document.getElementById('add-todo').addEventListener('click', () => {
    const text = todoInput ? todoInput.value.trim().slice(0,200) : '';
    if (!text) { showToast('Enter a task first.','error'); return; }
    const dateVal = todoDHidden ? sanitizeDate(todoDHidden.value) : '';
    const timeVal = todoTimeHidden ? sanitizeTime(todoTimeHidden.value) : '';
    const allday = todoAllDay ? todoAllDay.checked : false;
    let deadline = null;
    if (dateVal) deadline = allday ? dateVal+'T23:59:59' : (timeVal ? dateVal+'T'+timeVal : dateVal+'T23:59:59');
    const priorEl = document.getElementById('todo-priority');
    const progEl = document.getElementById('todo-progress');
    const priority = priorEl && ['Low','Medium','High','Urgent'].includes(priorEl.value) ? priorEl.value : 'Medium';
    const progress = progEl && ['Not Started','In Progress','Done'].includes(progEl.value) ? progEl.value : 'Not Started';
    const todos = getStorage('todos',[]);
    todos.push({ text, deadline, allday, priority, progress, addedAt: Date.now(), completedAt: progress==='Done'?Date.now():null, id: Date.now()+Math.random() });
    setStorage('todos', todos);
    if (todoInput) todoInput.value = '';
    if (todoDHidden) todoDHidden.value = ''; if (todoDDisplay) todoDDisplay.value = '';
    if (todoTimeHidden) todoTimeHidden.value = ''; if (todoTimeDisplay) todoTimeDisplay.value = '';
    renderTodos(); showToast('Task added!','success');
  });

  const todoSearch = document.getElementById('todo-search');
  const todoSort = document.getElementById('todo-sort');
  if (todoSearch) {
    const onSearch = debounce(() => { _todoState.query = todoSearch.value.trim(); renderTodos(); }, 250);
    todoSearch.addEventListener('input', onSearch);
    todoSearch.addEventListener('search', onSearch);
  }
  if (todoSort) {
    todoSort.value = _todoState.sort;
    todoSort.addEventListener('change', () => { _todoState.sort = todoSort.value; renderTodos(); });
  }

  renderTodos();
}

function renderTodos() {
  const el = document.getElementById('todo-list');
  if (!el) return;
  let todos = getStorage('todos',[]);
  const now = Date.now();

  todos = todos.filter(t => {
    if (t.progress==='Done' && t.completedAt && now-t.completedAt >= 86400000) return false;
    if (t.deadline && t.progress!=='Done' && new Date(t.deadline).getTime()+86400000 < now) return false;
    return true;
  });
  setStorage('todos', todos);

  const { query, sort } = _todoState;
  const visible = todos.filter(t =>
    matchesQuery(query, [t.text, t.priority, t.progress])
  );

  const sorted = stableSort(visible, (a, b) => {
    switch (sort) {
      case 'date-asc':      return (a.addedAt || 0) - (b.addedAt || 0);
      case 'alpha-asc':     return a.text.localeCompare(b.text);
      case 'alpha-desc':    return b.text.localeCompare(a.text);
      case 'deadline-asc':  return (a.deadline ? new Date(a.deadline).getTime() : Infinity) - (b.deadline ? new Date(b.deadline).getTime() : Infinity);
      case 'deadline-desc': return (b.deadline ? new Date(b.deadline).getTime() : -Infinity) - (a.deadline ? new Date(a.deadline).getTime() : -Infinity);
      case 'priority-asc':  return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
      case 'priority-desc': return (PRIORITY_ORDER[b.priority] ?? 2) - (PRIORITY_ORDER[a.priority] ?? 2);
      default:              return (b.addedAt || 0) - (a.addedAt || 0); // date-desc
    }
  });

  if (!sorted.length) {
    el.innerHTML = `<li style="color:var(--md-on-surface-variant);font-size:0.875rem;padding:0.5rem 0;list-style:none;">${todos.length ? 'No tasks match your search.' : 'No tasks yet.'}</li>`;
    return;
  }

  const prMap = { Low:'badge-low', Medium:'badge-medium', High:'badge-high', Urgent:'badge-urgent' };
  const pgMap = { 'Not Started':'badge-notstarted', 'In Progress':'badge-inprogress', 'Done':'badge-done' };

  el.innerHTML = sorted.map(t => `
    <li class="todo-item${t.progress==='Done'?' done':''}">
      <input type="checkbox" ${t.progress==='Done'?'checked':''} data-id="${sanitize(String(t.id))}" aria-label="Mark ${sanitize(t.text)} as done">
      <div class="todo-item-text">
        <div>${sanitize(t.text)}</div>
        <div class="todo-meta">${t.deadline?'Due: '+sanitize(new Date(t.deadline).toLocaleString()):'No deadline'}</div>
        <div class="todo-badges">
          <span class="badge ${sanitize(prMap[t.priority]||'badge-medium')}">${sanitize(t.priority)}</span>
          <span class="badge ${sanitize(pgMap[t.progress]||'badge-notstarted')}">${sanitize(t.progress)}</span>
        </div>
      </div>
      <button class="todo-delete" data-id="${sanitize(String(t.id))}" aria-label="Delete task"><span class="material-icons-round" aria-hidden="true">delete</span></button>
    </li>`).join('');

  el.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.id;
      let todos = getStorage('todos',[]);
      const idx = todos.findIndex(t => String(t.id) === id);
      if (idx < 0) return;
      todos[idx].progress = todos[idx].progress==='Done'?'Not Started':'Done';
      todos[idx].completedAt = todos[idx].progress==='Done'?Date.now():null;
      setStorage('todos', todos); renderTodos();
    });
  });
  el.querySelectorAll('.todo-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      let todos = getStorage('todos',[]);
      const idx = todos.findIndex(t => String(t.id) === id);
      if (idx < 0) return;
      todos.splice(idx, 1);
      setStorage('todos', todos); renderTodos();
    });
  });
}

function initHabits() {
  const habitInput = document.getElementById('habit-input');
  habitInput && habitInput.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('add-habit') && document.getElementById('add-habit').click(); });
  document.getElementById('add-habit') && document.getElementById('add-habit').addEventListener('click', () => {
    const input = document.getElementById('habit-input');
    const name = input ? input.value.trim().slice(0,100) : '';
    if (!name) { showToast('Enter a habit name.','error'); return; }
    const habits = getStorage('habits',[]);
    habits.push({ name, days:{}, createdAt: todayStr() });
    setStorage('habits', habits);
    if (input) input.value = '';
    renderHabits(); showToast('Habit added!','success');
  });
  document.getElementById('download-habits') && document.getElementById('download-habits').addEventListener('click', exportHabitsCSV);
  renderHabits();
}

function renderHabits() {
  const habits = getStorage('habits',[]);
  const weekDays = getCurrentWeekDates();
  const today = todayStr();
  const metEl = document.getElementById('habit-metrics');
  const gridEl = document.getElementById('habit-grid');
  const motEl = document.getElementById('habit-motivation');
  let doneTotal = 0;
  habits.forEach(h => { weekDays.forEach(d => { if (h.days && h.days[d]) doneTotal++; }); });
  const total = habits.length * 7;
  const pct = total ? Math.round((doneTotal/total)*100) : 0;
  let doneToday = 0;
  habits.forEach(h => { if (h.days && h.days[today]) doneToday++; });
  let streak = 0;
  let cur = new Date(today+'T12:00:00');
  while (habits.length > 0 && habits.every(h => h.days && h.days[cur.toISOString().slice(0,10)])) { streak++; cur.setDate(cur.getDate()-1); }
  if (metEl) metEl.innerHTML = `
    <div class="metric-item"><div class="metric-value">${pct}%</div><div class="metric-label">This week</div></div>
    <div class="metric-item"><div class="metric-value">${doneToday}/${habits.length}</div><div class="metric-label">Today</div></div>
    <div class="metric-item"><div class="metric-value">${streak}</div><div class="metric-label">Day streak</div></div>
    <div class="metric-item"><div class="metric-value">${habits.length}</div><div class="metric-label">Total habits</div></div>`;
  if (gridEl) {
    if (!habits.length) { gridEl.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:0.875rem;">No habits yet. Add one above!</p>'; }
    else {
      gridEl.innerHTML = `<table class="habit-table" role="grid">
        <thead><tr><th scope="col">Habit</th>${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<th scope="col">${sanitize(d)}</th>`).join('')}<th scope="col">Del</th></tr></thead>
        <tbody>${habits.map((h,hi) => `<tr><td>${sanitize(h.name)}</td>${weekDays.map(day=>{
          const checked = h.days&&h.days[day]?'checked':'';
          if (day === today) return `<td><input type="checkbox" ${checked} data-hi="${hi}" data-day="${sanitize(day)}" aria-label="${sanitize(h.name)} on ${sanitize(day)}"></td>`;
          if (day < today) return `<td class="habit-day-past"><input type="checkbox" ${checked} disabled data-hi="${hi}" data-day="${sanitize(day)}" aria-label="${sanitize(h.name)} on ${sanitize(day)}"></td>`;
          return `<td class="habit-day-future"><input type="checkbox" disabled data-hi="${hi}" data-day="${sanitize(day)}" aria-label="${sanitize(h.name)} on ${sanitize(day)}"></td>`;
        }).join('')}<td><button class="habit-del-btn" data-hi="${hi}" aria-label="Delete ${sanitize(h.name)}"><span class="material-icons-round" aria-hidden="true">delete</span></button></td></tr>`).join('')}</tbody>
      </table>`;
      gridEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.dataset.day !== todayStr()) return;
          let habits = getStorage('habits',[]); const hi = parseInt(cb.dataset.hi); const day = cb.dataset.day;
          if (!habits[hi].days) habits[hi].days = {};
          habits[hi].days[day] = cb.checked;
          setStorage('habits', habits); renderHabits(); updateHomeDashboard();
          if (cb.checked) addCoins(2, 'Habit completed');
        });
      });
      gridEl.querySelectorAll('.habit-del-btn').forEach(btn => {
        btn.addEventListener('click', () => { let habits = getStorage('habits',[]); habits.splice(parseInt(btn.dataset.hi),1); setStorage('habits',habits); renderHabits(); updateHomeDashboard(); });
      });
    }
  }
  const msgs = ['Let\'s get started! Small steps lead to big changes.','Every step counts. Try to do a bit more next week!','You\'re making progress. Stay consistent!','Great job! Keep up the good work!','Amazing! You completed all your habits this week!'];
  if (motEl) motEl.textContent = msgs[pct===100?4:pct>=70?3:pct>=40?2:pct>0?1:0];
}

function exportHabitsCSV() {
  const habits = getStorage('habits',[]);
  let allDays = [];
  habits.forEach(h => { if (h.days) allDays = allDays.concat(Object.keys(h.days)); });
  allDays = [...new Set(allDays)].sort();
  const header = ['Habit',...allDays];
  const rows = habits.map(h => [h.name,...allDays.map(d => h.days&&h.days[d]?'1':'0')]);
  const csv = [header,...rows].map(r => r.map(c => '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='habits.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

let calendarState = { viewMode:'month', month:new Date().getMonth(), year:new Date().getFullYear(), day:new Date().getDate(), selectedDate:null, notifications:[] };

function initCalendar() {
  const monthSel = document.getElementById('calendar-month');
  const yearSel = document.getElementById('calendar-year');
  const viewSel = document.getElementById('calendar-view-mode');
  if (monthSel) {
    ['January','February','March','April','May','June','July','August','September','October','November','December'].forEach((m,i) => {
      const o = document.createElement('option'); o.value=i; o.textContent=m; if(i===calendarState.month) o.selected=true; monthSel.appendChild(o);
    });
  }
  if (yearSel) {
    const ty = new Date().getFullYear();
    for (let y=ty-5; y<=ty+5; y++) { const o=document.createElement('option'); o.value=y; o.textContent=y; if(y===calendarState.year) o.selected=true; yearSel.appendChild(o); }
  }
  viewSel && viewSel.addEventListener('change', () => { calendarState.viewMode=viewSel.value; renderCalendar(); });
  monthSel && monthSel.addEventListener('change', () => { calendarState.month=parseInt(monthSel.value); renderCalendar(); });
  yearSel && yearSel.addEventListener('change', () => { calendarState.year=parseInt(yearSel.value); renderCalendar(); });
  document.getElementById('prev-period') && document.getElementById('prev-period').addEventListener('click', () => {
    if (calendarState.viewMode==='month') { calendarState.month--; if(calendarState.month<0){calendarState.month=11;calendarState.year--;} }
    else if (calendarState.viewMode==='week') { const d=new Date(calendarState.year,calendarState.month,calendarState.day); d.setDate(d.getDate()-7); calendarState.year=d.getFullYear();calendarState.month=d.getMonth();calendarState.day=d.getDate(); }
    else if (calendarState.viewMode==='day') { const d=new Date(calendarState.year,calendarState.month,calendarState.day); d.setDate(d.getDate()-1); calendarState.year=d.getFullYear();calendarState.month=d.getMonth();calendarState.day=d.getDate(); }
    else if (calendarState.viewMode==='year') { calendarState.year--; }
    if (monthSel) monthSel.value=calendarState.month; if (yearSel) yearSel.value=calendarState.year; renderCalendar();
  });
  document.getElementById('next-period') && document.getElementById('next-period').addEventListener('click', () => {
    if (calendarState.viewMode==='month') { calendarState.month++; if(calendarState.month>11){calendarState.month=0;calendarState.year++;} }
    else if (calendarState.viewMode==='week') { const d=new Date(calendarState.year,calendarState.month,calendarState.day); d.setDate(d.getDate()+7); calendarState.year=d.getFullYear();calendarState.month=d.getMonth();calendarState.day=d.getDate(); }
    else if (calendarState.viewMode==='day') { const d=new Date(calendarState.year,calendarState.month,calendarState.day); d.setDate(d.getDate()+1); calendarState.year=d.getFullYear();calendarState.month=d.getMonth();calendarState.day=d.getDate(); }
    else if (calendarState.viewMode==='year') { calendarState.year++; }
    if (monthSel) monthSel.value=calendarState.month; if (yearSel) yearSel.value=calendarState.year; renderCalendar();
  });
  document.getElementById('add-event-global') && document.getElementById('add-event-global').addEventListener('click', () => {
    const ds = `${calendarState.year}-${String(calendarState.month+1).padStart(2,'0')}-${String(calendarState.day).padStart(2,'0')}`;
    calendarState.selectedDate = ds; openEventForm(ds);
  });
  document.getElementById('event-allday') && document.getElementById('event-allday').addEventListener('change', () => {
    const tg=document.getElementById('event-time-group'); if(tg) tg.style.opacity=document.getElementById('event-allday').checked?'0.4':'';
  });
  document.getElementById('event-time-trigger') && document.getElementById('event-time-trigger').addEventListener('click', () => {
    openTimePicker(document.getElementById('event-time').value||'', picked => { document.getElementById('event-time').value=picked; document.getElementById('event-time-display').value=formatTimeTo12(picked); });
  });
  document.getElementById('add-notification-btn') && document.getElementById('add-notification-btn').addEventListener('click', () => { if(calendarState.notifications.length>=5) return; calendarState.notifications.push(''); renderNotifInputs(); });
  document.getElementById('save-event') && document.getElementById('save-event').addEventListener('click', saveCalendarEvent);
  document.getElementById('cancel-event') && document.getElementById('cancel-event').addEventListener('click', () => { const ef=document.getElementById('calendar-event-form'); if(ef) ef.style.display='none'; calendarState.notifications=[]; });
  renderCalendar();
}

function renderCalendar() {
  if (calendarState.viewMode==='month') renderMonthView();
  else if (calendarState.viewMode==='week') renderWeekView();
  else if (calendarState.viewMode==='day') renderDayView();
  else renderYearView();
}
function renderMonthView() {
  const el=document.getElementById('calendar-view'); if(!el) return;
  const events=getStorage('calendarEvents',{}), today=new Date();
  const fd=new Date(calendarState.year,calendarState.month,1).getDay();
  const dim=new Date(calendarState.year,calendarState.month+1,0).getDate();
  let html='<table class="cal-table" role="grid"><thead><tr>'+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<th scope="col">${d}</th>`).join('')+'</tr></thead><tbody><tr>';
  for(let i=0;i<fd;i++) html+='<td></td>';
  for(let d=1;d<=dim;d++) {
    const ds=`${calendarState.year}-${String(calendarState.month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday=d===today.getDate()&&calendarState.month===today.getMonth()&&calendarState.year===today.getFullYear();
    const hasEv=events[ds]&&events[ds].length>0;
    html+=`<td class="${isToday?'today':''}${hasEv?' has-event':''}" data-date="${sanitize(ds)}" tabindex="0" role="gridcell" aria-label="${sanitize(ds)}${hasEv?', has events':''}">${d}</td>`;
    if((fd+d)%7===0) html+='</tr><tr>';
  }
  html+='</tr></tbody></table>';
  el.innerHTML=html;
  el.querySelectorAll('td[data-date]').forEach(cell => {
    const h=()=>{ calendarState.selectedDate=cell.dataset.date; calendarState.day=parseInt(cell.dataset.date.split('-')[2]); showDayDetails(cell.dataset.date); };
    cell.addEventListener('click',h); cell.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')h();});
  });
  const detEl=document.getElementById('calendar-details'); if(detEl) detEl.innerHTML='';
}
function renderWeekView() {
  const el=document.getElementById('calendar-view'); if(!el) return;
  const events=getStorage('calendarEvents',{});
  const d=new Date(calendarState.year,calendarState.month,calendarState.day);
  const ws=new Date(d); ws.setDate(d.getDate()-d.getDay());
  let html='<div class="cal-week-view">';
  for(let i=0;i<7;i++) {
    const day=new Date(ws); day.setDate(ws.getDate()+i);
    const ds=day.toISOString().slice(0,10); const evs=events[ds]||[];
    html+=`<div class="cal-week-day"><div class="cal-week-day-header">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]} ${day.getDate()}</div>`;
    html+=evs.length?evs.map(ev=>renderEventChip(ev)).join(''):'<span style="font-size:0.8rem;color:var(--md-on-surface-variant)">No events</span>';
    html+='</div>';
  }
  el.innerHTML=html+'</div>';
}
function renderDayView() {
  const el=document.getElementById('calendar-view'); if(!el) return;
  const ds=`${calendarState.year}-${String(calendarState.month+1).padStart(2,'0')}-${String(calendarState.day).padStart(2,'0')}`;
  const evs=(getStorage('calendarEvents',{}))[ds]||[];
  el.innerHTML=`<div class="cal-day-view"><div class="cal-week-day-header">${sanitize(formatDateDisplay(ds))}</div>${evs.length?evs.map(ev=>renderEventChip(ev)).join(''):'<p style="color:var(--md-on-surface-variant);font-size:0.875rem;margin-top:0.5rem;">No events for this day.</p>'}</div>`;
}
function renderYearView() {
  const el=document.getElementById('calendar-view'); if(!el) return;
  const events=getStorage('calendarEvents',{});
  let html='<div class="cal-year-view">';
  ['January','February','March','April','May','June','July','August','September','October','November','December'].forEach((mName,m) => {
    html+=`<div class="cal-year-month"><div class="cal-year-month-title">${sanitize(mName)}</div>`;
    let hasAny=false;
    for(let d=1;d<=31;d++) { const ds=`${calendarState.year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; const evs=events[ds]||[]; if(evs.length){hasAny=true;html+=`<div style="margin:2px 0 2px 1rem;font-size:0.8rem;color:var(--md-on-surface-variant)">${d}: ${evs.map(ev=>sanitize(ev.title)).join(', ')}</div>`;} }
    if(!hasAny) html+='<span style="font-size:0.78rem;color:var(--md-on-surface-variant);opacity:0.6">No events</span>';
    html+='</div>';
  });
  el.innerHTML=html+'</div>';
}
function renderEventChip(ev) {
  return `<div class="cal-event"><span class="cal-event-type ${sanitize(ev.type)}">${sanitize(ev.type)}</span><span class="cal-event-title">${sanitize(ev.title)}</span><span class="cal-event-time">${ev.allday?'All day':sanitize(formatTimeTo12(ev.time)||'')}</span></div>`;
}
function showDayDetails(date) {
  const el=document.getElementById('calendar-details'); if(!el) return;
  const evs=(getStorage('calendarEvents',{}))[date]||[];
  let html=`<div style="margin-bottom:0.75rem;font-weight:700;color:var(--md-on-surface)">${sanitize(formatDateDisplay(date))}</div>`;
  html+=evs.length?evs.map((ev,idx)=>`<div class="cal-event"><span class="cal-event-type ${sanitize(ev.type)}">${sanitize(ev.type)}</span><span class="cal-event-title">${sanitize(ev.title)}</span><span class="cal-event-time">${ev.allday?'All day':sanitize(formatTimeTo12(ev.time)||'')}</span><button class="cal-event-del" data-date="${sanitize(date)}" data-idx="${idx}" aria-label="Delete event"><span class="material-icons-round" aria-hidden="true">delete</span></button></div>`).join(''):'<p style="color:var(--md-on-surface-variant);font-size:0.875rem;margin-bottom:0.75rem;">No events.</p>';
  html+=`<button class="btn-secondary" id="add-event-day-btn" style="margin-top:0.5rem;"><span class="material-icons-round" style="font-size:1rem;margin-right:4px" aria-hidden="true">add</span>Add Event</button>`;
  el.innerHTML=html;
  el.querySelectorAll('.cal-event-del').forEach(btn => {
    btn.addEventListener('click',()=>{ let evts=getStorage('calendarEvents',{}); const d=btn.dataset.date,i=parseInt(btn.dataset.idx); if(evts[d]){evts[d].splice(i,1);if(!evts[d].length)delete evts[d];} setStorage('calendarEvents',evts); renderCalendar(); showDayDetails(d); });
  });
  document.getElementById('add-event-day-btn') && document.getElementById('add-event-day-btn').addEventListener('click',()=>openEventForm(date));
}
function openEventForm(date) {
  const ef=document.getElementById('calendar-event-form'); if(!ef) return;
  ef.style.display='';
  const ti=document.getElementById('cal-form-title'); if(ti) ti.textContent='Add Event for '+formatDateDisplay(date);
  const et=document.getElementById('event-title'); if(et) et.value='';
  const etype=document.getElementById('event-type'); if(etype) etype.value='event';
  const allday=document.getElementById('event-allday'); if(allday) allday.checked=false;
  const etd=document.getElementById('event-time-display'); if(etd) etd.value='';
  const eth=document.getElementById('event-time'); if(eth) eth.value='';
  const tg=document.getElementById('event-time-group'); if(tg) tg.style.opacity='';
  calendarState.notifications=[]; renderNotifInputs(); calendarState.selectedDate=date;
  ef.scrollIntoView({behavior:'smooth'});
}
function renderNotifInputs() {
  const el=document.getElementById('notification-list'); if(!el) return;
  el.innerHTML=calendarState.notifications.map((t,i)=>`
    <div class="notification-item">
      <div class="time-picker-wrap" style="flex:1;">
        <input type="text" class="input-field time-display-input notif-time-disp" value="${t?sanitize(formatTimeTo12(t)):''}" data-i="${i}" placeholder="Pick time…" aria-label="Notification time ${i+1}" readonly style="padding-right:3rem;">
        <button type="button" class="time-picker-trigger notif-time-btn" data-i="${i}" aria-label="Open time picker"><span class="material-icons-round" aria-hidden="true">schedule</span></button>
        <input type="hidden" class="notif-time-hidden" data-i="${i}" value="${sanitize(t)}">
      </div>
      <button class="remove-notif" data-i="${i}" type="button" aria-label="Remove notification"><span class="material-icons-round" aria-hidden="true">close</span></button>
    </div>`).join('');
  el.querySelectorAll('.notif-time-btn').forEach(btn => {
    btn.addEventListener('click',()=>{ const i=parseInt(btn.dataset.i); const hidden=el.querySelector(`.notif-time-hidden[data-i="${i}"]`); const disp=el.querySelector(`.notif-time-disp[data-i="${i}"]`); openTimePicker(hidden?hidden.value:'',picked=>{ calendarState.notifications[i]=sanitizeTime(picked); if(hidden)hidden.value=sanitizeTime(picked); if(disp)disp.value=formatTimeTo12(picked); }); });
  });
  el.querySelectorAll('.remove-notif').forEach(btn => { btn.addEventListener('click',()=>{ calendarState.notifications.splice(parseInt(btn.dataset.i),1); renderNotifInputs(); }); });
  const addBtn=document.getElementById('add-notification-btn'); if(addBtn) addBtn.disabled=calendarState.notifications.length>=5;
}
function saveCalendarEvent() {
  if(!calendarState.selectedDate) return;
  const titleEl=document.getElementById('event-title'); const title=titleEl?titleEl.value.trim().slice(0,200):'';
  if(!title){showToast('Enter an event title.','error');return;}
  const typeEl=document.getElementById('event-type'); const type=typeEl&&['event','task','reminder','deadline'].includes(typeEl.value)?typeEl.value:'event';
  const alldayEl=document.getElementById('event-allday'); const allday=alldayEl?alldayEl.checked:false;
  const timeVal=sanitizeTime(document.getElementById('event-time')?document.getElementById('event-time').value:'');
  if(!allday&&!timeVal){showToast('Enter a time or check All Day.','error');return;}
  const notifs=calendarState.notifications.filter(n=>n&&sanitizeTime(n));
  let evts=getStorage('calendarEvents',{}); if(!evts[calendarState.selectedDate]) evts[calendarState.selectedDate]=[];
  evts[calendarState.selectedDate].push({title,type,allday,time:timeVal,notifications:notifs});
  setStorage('calendarEvents',evts);
  const ef=document.getElementById('calendar-event-form'); if(ef) ef.style.display='none';
  calendarState.notifications=[]; showDayDetails(calendarState.selectedDate); renderCalendar(); showToast('Event saved!','success');
}

function initFlashcards() {
  const deckNameInput = document.getElementById('flashcard-deck-name');
  const addDeckBtn = document.getElementById('add-flashcard-deck');
  addDeckBtn && addDeckBtn.addEventListener('click', () => {
    const name = deckNameInput ? deckNameInput.value.trim().slice(0,100) : '';
    if (!name) { showToast('Enter a deck name.','error'); return; }
    const decks = getStorage('flashcard_decks',[]);
    decks.push({ name, cards:[], id: Date.now()+Math.random() });
    setStorage('flashcard_decks', decks);
    if (deckNameInput) deckNameInput.value = '';
    renderDecksList(); showToast('Deck created!','success');
  });
  deckNameInput && deckNameInput.addEventListener('keydown', e => { if(e.key==='Enter') addDeckBtn && addDeckBtn.click(); });
  document.getElementById('add-flashcard') && document.getElementById('add-flashcard').addEventListener('click', () => {
    const q = document.getElementById('flashcard-question');
    const a = document.getElementById('flashcard-answer');
    const question = q ? q.value.trim().slice(0,300) : '';
    const answer = a ? a.value.trim().slice(0,300) : '';
    if (!question || !answer) { showToast('Enter both question and answer.','error'); return; }
    const decks = getStorage('flashcard_decks',[]);
    const idx = getStorage('current_deck_idx', -1);
    if (idx < 0 || idx >= decks.length) return;
    if (!decks[idx].cards) decks[idx].cards = [];
    decks[idx].cards.push({ question, answer, correct:0, wrong:0, id: Date.now()+Math.random() });
    setStorage('flashcard_decks', decks);
    if (q) q.value = ''; if (a) a.value = '';
    renderDeckCards(idx); showToast('Card added!','success');
  });
  document.getElementById('delete-flashcard-deck') && document.getElementById('delete-flashcard-deck').addEventListener('click', () => {
    const idx = getStorage('current_deck_idx',-1);
    if (idx < 0) return;
    if (!confirm('Delete this deck and all its cards?')) return;
    const decks = getStorage('flashcard_decks',[]);
    decks.splice(idx, 1);
    setStorage('flashcard_decks', decks);
    setStorage('current_deck_idx', -1);
    const sec = document.getElementById('flashcard-deck-section'); if(sec) sec.style.display='none';
    renderDecksList(); showToast('Deck deleted.','');
  });
  document.getElementById('close-flashcard-deck') && document.getElementById('close-flashcard-deck').addEventListener('click', () => {
    const sec = document.getElementById('flashcard-deck-section'); if(sec) sec.style.display='none';
    setStorage('current_deck_idx',-1);
  });
  renderDecksList();
}

function renderDecksList() {
  const el = document.getElementById('flashcard-decks-list');
  if (!el) return;
  const decks = getStorage('flashcard_decks',[]);
  if (!decks.length) { el.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:0.875rem;">No decks yet. Create one above!</p>'; return; }
  el.innerHTML = decks.map((d,i) => `
    <div class="deck-item">
      <div class="deck-item-name">${sanitize(d.name)}</div>
      <div class="deck-item-count">${(d.cards||[]).length} cards</div>
      <div class="deck-item-actions">
        <button class="btn-filled open-deck-btn" data-i="${i}" type="button">Open</button>
      </div>
    </div>`).join('');
  el.querySelectorAll('.open-deck-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.i);
      setStorage('current_deck_idx', idx);
      renderDeckCards(idx);
      const sec = document.getElementById('flashcard-deck-section'); if(sec) sec.style.display='';
      sec && sec.scrollIntoView({behavior:'smooth'});
    });
  });
}

function renderDeckCards(idx) {
  const decks = getStorage('flashcard_decks',[]);
  const deck = decks[idx];
  if (!deck) return;
  const nameEl = document.getElementById('current-deck-name'); if(nameEl) nameEl.textContent = deck.name;
  const cards = deck.cards || [];
  const correct = cards.reduce((s,c)=>s+c.correct,0);
  const wrong = cards.reduce((s,c)=>s+c.wrong,0);
  const summEl = document.getElementById('flashcard-review-summary');
  if (summEl) {
    if (cards.length > 0) {
      summEl.className = 'review-summary active';
      summEl.innerHTML = `Cards: ${cards.length} · Correct: <strong style="color:var(--md-success)">${correct}</strong> · Wrong: <strong style="color:var(--md-error)">${wrong}</strong>`;
    } else {
      summEl.className = 'review-summary';
    }
  }
  const grid = document.getElementById('flashcard-deck-cards-grid');
  if (!grid) return;
  if (!cards.length) { grid.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:0.875rem;">No cards yet. Add one above!</p>'; return; }
  grid.innerHTML = cards.map((c,ci) => `
    <div>
      <div class="flashcard" data-idx="${idx}" data-ci="${ci}">
        <div class="flashcard-inner">
          <div class="fc-front">${sanitize(c.question)}</div>
          <div class="fc-back">${sanitize(c.answer)}</div>
        </div>
      </div>
      <div class="fc-actions-wrap" data-ci="${ci}">
        <div class="fc-actions">
          <button class="fc-btn correct${c.correct>0?' sel':''}" data-idx="${idx}" data-ci="${ci}" type="button">Correct (${c.correct})</button>
          <button class="fc-btn wrong${c.wrong>0?' sel':''}" data-idx="${idx}" data-ci="${ci}" type="button">Wrong (${c.wrong})</button>
          <button class="fc-btn del" data-idx="${idx}" data-ci="${ci}" type="button">Delete</button>
        </div>
      </div>
    </div>`).join('');
  grid.querySelectorAll('.flashcard').forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('flipped');
      const ci = card.dataset.ci;
      const wrap = grid.querySelector(`.fc-actions-wrap[data-ci="${ci}"]`);
      if (wrap) wrap.classList.toggle('visible', card.classList.contains('flipped'));
    });
  });
  grid.querySelectorAll('.fc-btn.correct').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation();
      const decks = getStorage('flashcard_decks',[]); const i=parseInt(btn.dataset.idx); const ci=parseInt(btn.dataset.ci);
      decks[i].cards[ci].correct++; setStorage('flashcard_decks',decks); renderDeckCards(i);
    });
  });
  grid.querySelectorAll('.fc-btn.wrong').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation();
      const decks = getStorage('flashcard_decks',[]); const i=parseInt(btn.dataset.idx); const ci=parseInt(btn.dataset.ci);
      decks[i].cards[ci].wrong++; setStorage('flashcard_decks',decks); renderDeckCards(i);
    });
  });
  grid.querySelectorAll('.fc-btn.del').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation();
      if(!confirm('Delete this card?')) return;
      const decks = getStorage('flashcard_decks',[]); const i=parseInt(btn.dataset.idx); const ci=parseInt(btn.dataset.ci);
      decks[i].cards.splice(ci,1); setStorage('flashcard_decks',decks); renderDeckCards(i);
    });
  });
}

const MUSIC_TRACKS = [
  { name:'Lofi Hip Hop Radio', channel:'Chillhop Music', id:'jfKfPfyJRdk' },
  { name:'Chill Lofi Study Beats', channel:'Lo-Fi Beats', id:'5qap5aO4i9A' },
  { name:'Jazz & Bossa Nova', channel:'Café Music BGM', id:'Dx5qFachd3A' },
  { name:'Deep Focus Music', channel:'Greenred Productions', id:'WPni755-Krg' },
  { name:'Peaceful Piano', channel:'Soothing Relaxation', id:'1ZYbU82GVz4' }
];
let currentTrackIdx = 0;

function initMusic() {
  updateMusicTrack();
  document.getElementById('play-music') && document.getElementById('play-music').addEventListener('click', () => {
    const iframe = document.getElementById('music-iframe');
    if (!iframe) return;
    const src = iframe.src;
    if (src.includes('autoplay=0')) {
      iframe.src = src.replace('autoplay=0','autoplay=1');
      document.getElementById('play-music').innerHTML = '<span class="material-icons-round" aria-hidden="true">pause</span>Pause';
    } else if (src.includes('autoplay=1')) {
      iframe.src = src.replace('autoplay=1','autoplay=0');
      document.getElementById('play-music').innerHTML = '<span class="material-icons-round" aria-hidden="true">play_arrow</span>Play';
    }
  });
  document.getElementById('prev-music') && document.getElementById('prev-music').addEventListener('click', () => {
    currentTrackIdx = (currentTrackIdx - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
    updateMusicTrack();
  });
  document.getElementById('next-music') && document.getElementById('next-music').addEventListener('click', () => {
    currentTrackIdx = (currentTrackIdx + 1) % MUSIC_TRACKS.length;
    updateMusicTrack();
  });
}

function updateMusicTrack() {
  const track = MUSIC_TRACKS[currentTrackIdx];
  const nameEl = document.getElementById('track-name'); if(nameEl) nameEl.textContent = track.name;
  const chanEl = document.getElementById('track-channel'); if(chanEl) chanEl.textContent = track.channel;
  const iframe = document.getElementById('music-iframe');
  if (iframe) iframe.src = `https://www.youtube.com/embed/${track.id}?autoplay=0`;
  const playBtn = document.getElementById('play-music');
  if (playBtn) playBtn.innerHTML = '<span class="material-icons-round" aria-hidden="true">play_arrow</span>Play';
}

let pomodoroTimer = null, pomodoroRunning = false, pomodoroSeconds = 25*60, pomodoroMode = 'pomodoro';
let stopwatchTimer = null, stopwatchRunning = false, stopwatchSeconds = 0, stopwatchLaps = [];
let clockTimer = null;

function initPomodoro() {
  const pmodes = document.querySelectorAll('.pmode');
  pmodes.forEach(btn => {
    btn.addEventListener('click', () => {
      pmodes.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
      pomodoroMode = btn.dataset.pmode;
      switchPomodoroMode(pomodoroMode);
    });
  });

  document.getElementById('start-pomodoro') && document.getElementById('start-pomodoro').addEventListener('click', startPomodoro);
  document.getElementById('pause-pomodoro') && document.getElementById('pause-pomodoro').addEventListener('click', pausePomodoro);
  document.getElementById('reset-pomodoro') && document.getElementById('reset-pomodoro').addEventListener('click', resetPomodoro);
  document.getElementById('start-stopwatch') && document.getElementById('start-stopwatch').addEventListener('click', startStopwatch);
  document.getElementById('lap-stopwatch') && document.getElementById('lap-stopwatch').addEventListener('click', lapStopwatch);
  document.getElementById('reset-stopwatch') && document.getElementById('reset-stopwatch').addEventListener('click', resetStopwatch);

  const durInput = document.getElementById('pomo-duration');
  durInput && durInput.addEventListener('change', () => {
    const val = sanitizeNum(durInput.value, 1, 99);
    durInput.value = val;
    if (!pomodoroRunning) {
      pomodoroSeconds = val * 60;
      updatePomodoroDisplay();
    }
  });

  updatePomodoroDisplay();
  startClock();
  rotatePomodoroTips();

  const stabs = document.querySelectorAll('.tab[data-stab]');
  stabs.forEach(t => {
    t.addEventListener('click', () => {
      stabs.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
      document.querySelectorAll('.stab-panel').forEach(p => p.classList.remove('active'));
      t.classList.add('active'); t.setAttribute('aria-selected','true');
      const panel = document.getElementById('stab-' + t.dataset.stab);
      if (panel) panel.classList.add('active');
    });
  });
}

function switchPomodoroMode(mode) {
  clearInterval(pomodoroTimer); clearInterval(stopwatchTimer); clearInterval(clockTimer);
  pomodoroRunning = false; stopwatchRunning = false;
  const timerRing = document.getElementById('timer-ring');
  const clockDisplay = document.getElementById('clock-display');
  const pomoControls = document.getElementById('pomodoro-controls');
  const swControls = document.getElementById('stopwatch-controls');
  const pomoSettings = document.getElementById('pomo-settings');
  const lapsList = document.getElementById('stopwatch-laps');
  const countdownSection = document.getElementById('countdown-section');

  [timerRing, clockDisplay, pomoControls, swControls, pomoSettings, countdownSection, lapsList].forEach(el => {
    if (el) el.style.display = 'none';
  });

  if (mode === 'pomodoro') {
    if (timerRing) timerRing.style.display = '';
    if (pomoControls) pomoControls.style.display = '';
    if (pomoSettings) pomoSettings.style.display = '';
    const dur = sanitizeNum(document.getElementById('pomo-duration') ? document.getElementById('pomo-duration').value : 25, 1, 99);
    pomodoroSeconds = dur * 60;
    updatePomodoroDisplay();
  } else if (mode === 'stopwatch') {
    if (timerRing) timerRing.style.display = '';
    if (swControls) swControls.style.display = '';
    stopwatchSeconds = 0; stopwatchLaps = [];
    if (lapsList) { lapsList.innerHTML = ''; }
    updateStopwatchDisplay();
  } else if (mode === 'clock') {
    if (clockDisplay) clockDisplay.style.display = '';
    if (countdownSection) countdownSection.style.display = '';
    startClock();
  }
}

function startPomodoro() {
  if (pomodoroRunning) return;
  pomodoroRunning = true;
  pomodoroTimer = setInterval(() => {
    pomodoroSeconds--;
    if (pomodoroSeconds <= 0) {
      clearInterval(pomodoroTimer); pomodoroRunning = false;
      pomodoroSeconds = 0; updatePomodoroDisplay();
      const sessions = getStorage('pomodoro_sessions',[]);
      sessions.push({ date: todayStr(), timestamp: Date.now() });
      setStorage('pomodoro_sessions', sessions);
      showToast('Pomodoro complete! Take a break.', 'success');
      addCoins(5, 'Pomodoro Session');
      updateHomeDashboard();
    } else {
      updatePomodoroDisplay();
    }
  }, 1000);
}

function pausePomodoro() {
  clearInterval(pomodoroTimer); pomodoroRunning = false;
}

function resetPomodoro() {
  clearInterval(pomodoroTimer); pomodoroRunning = false;
  const dur = sanitizeNum(document.getElementById('pomo-duration') ? document.getElementById('pomo-duration').value : 25, 1, 99);
  pomodoroSeconds = dur * 60;
  updatePomodoroDisplay();
}

function updatePomodoroDisplay() {
  const m = Math.floor(pomodoroSeconds / 60);
  const s = pomodoroSeconds % 60;
  const display = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const el = document.getElementById('timer-value'); if(el) el.textContent = display;
  const dur = sanitizeNum(document.getElementById('pomo-duration') ? document.getElementById('pomo-duration').value : 25, 1, 99);
  const total = dur * 60;
  const pct = total > 0 ? pomodoroSeconds / total : 1;
  const circumference = 2 * Math.PI * 88;
  const circle = document.getElementById('timer-progress-circle');
  if (circle) circle.style.strokeDashoffset = circumference * (1 - pct);
  const modeLabel = document.getElementById('timer-mode-label'); if(modeLabel) modeLabel.textContent = 'Focus';
}

function startStopwatch() {
  if (stopwatchRunning) return;
  stopwatchRunning = true;
  stopwatchTimer = setInterval(() => {
    stopwatchSeconds++;
    updateStopwatchDisplay();
  }, 1000);
}

function lapStopwatch() {
  if (!stopwatchRunning) return;
  stopwatchLaps.push(stopwatchSeconds);
  const el = document.getElementById('stopwatch-laps');
  if (el) {
    const li = document.createElement('li');
    const m = Math.floor(stopwatchSeconds/60), s = stopwatchSeconds%60;
    li.textContent = `Lap ${stopwatchLaps.length}: ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    el.appendChild(li);
    el.style.display = '';
  }
}

function resetStopwatch() {
  clearInterval(stopwatchTimer); stopwatchRunning = false;
  stopwatchSeconds = 0; stopwatchLaps = [];
  updateStopwatchDisplay();
  const el = document.getElementById('stopwatch-laps'); if(el) { el.innerHTML=''; el.style.display='none'; }
}

function updateStopwatchDisplay() {
  const m = Math.floor(stopwatchSeconds/60), s = stopwatchSeconds%60;
  const el = document.getElementById('timer-value'); if(el) el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const modeLabel = document.getElementById('timer-mode-label'); if(modeLabel) modeLabel.textContent = 'Stopwatch';
  const circle = document.getElementById('timer-progress-circle');
  if (circle) { const circumference = 2 * Math.PI * 88; circle.style.strokeDashoffset = circumference * (1 - (stopwatchSeconds % 60) / 60); }
}

function startClock() {
  clearInterval(clockTimer);
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const s = String(now.getSeconds()).padStart(2,'0');
    const el = document.getElementById('live-clock'); if(el) el.textContent = `${h}:${m}:${s}`;
  }
  tick();
  clockTimer = setInterval(tick, 1000);
}

const POMO_TIPS = [
  'Stay focused for 25 minutes, then take a short 5-minute break.',
  'Remove distractions before starting your session.',
  'After 4 pomodoros, take a longer 15-20 minute break.',
  'Write down your task before starting to stay on track.',
  'Drink water and stretch during your breaks.',
  'Turn off notifications during focus sessions.',
  'One task at a time — multitasking reduces efficiency.'
];

function rotatePomodoroTips() {
  let i = 0;
  const el = document.getElementById('pomo-tip-text');
  if (el) el.textContent = POMO_TIPS[0];
  setInterval(() => { i = (i+1) % POMO_TIPS.length; if(el) el.textContent = POMO_TIPS[i]; }, 15000);
}

let breathTimer = null, breathRunning = false, breathCycles = 0;
const BREATH_PATTERNS = {
  '478': [{ phase:'Inhale', dur:4000 }, { phase:'Hold', dur:7000 }, { phase:'Exhale', dur:8000 }],
  'box': [{ phase:'Inhale', dur:4000 }, { phase:'Hold', dur:4000 }, { phase:'Exhale', dur:4000 }, { phase:'Hold', dur:4000 }],
  'calm': [{ phase:'Inhale', dur:4000 }, { phase:'Exhale', dur:6000 }]
};
let selectedBreathType = '478';

function initWellness() {
  document.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-type]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
      selectedBreathType = btn.dataset.type;
      stopBreathing();
    });
  });

  document.getElementById('breath-start') && document.getElementById('breath-start').addEventListener('click', startBreathing);
  document.getElementById('breath-stop') && document.getElementById('breath-stop').addEventListener('click', stopBreathing);

  const wtabs = document.querySelectorAll('.tab[data-wtab]');
  wtabs.forEach(t => {
    t.addEventListener('click', () => {
      wtabs.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
      document.querySelectorAll('.wtab-panel').forEach(p => p.classList.remove('active'));
      t.classList.add('active'); t.setAttribute('aria-selected','true');
      const panel = document.getElementById('wtab-' + t.dataset.wtab);
      if (panel) panel.classList.add('active');
    });
  });

  document.getElementById('save-gratitude') && document.getElementById('save-gratitude').addEventListener('click', saveGratitude);
  renderGratitudeHistory();
  initChallenges();
  initReflectionPrompts();
}

function startBreathing() {
  if (breathRunning) return;
  breathRunning = true;
  breathCycles = 0;
  const cycleEl = document.getElementById('cycle-count'); if(cycleEl) cycleEl.textContent = '0';
  runBreathPhase(0);
}

function stopBreathing() {
  clearTimeout(breathTimer); breathRunning = false;
  const circle = document.getElementById('breathing-circle');
  const ring = document.getElementById('breathing-ring');
  const instr = document.getElementById('breath-instruction');
  if (circle) circle.className = 'breathing-circle';
  if (ring) ring.className = 'breathing-ring';
  if (instr) instr.textContent = 'Press Start';
}

function runBreathPhase(phaseIdx) {
  if (!breathRunning) return;
  const pattern = BREATH_PATTERNS[selectedBreathType] || BREATH_PATTERNS['478'];
  const phase = pattern[phaseIdx];
  const circle = document.getElementById('breathing-circle');
  const ring = document.getElementById('breathing-ring');
  const instr = document.getElementById('breath-instruction');
  if (instr) instr.textContent = phase.phase;
  if (circle) circle.className = 'breathing-circle ' + (phase.phase==='Inhale'?'expand':phase.phase==='Exhale'?'shrink':'hold');
  if (ring) ring.className = 'breathing-ring ' + (phase.phase==='Inhale'?'expand':phase.phase==='Exhale'?'shrink':'hold');
  breathTimer = setTimeout(() => {
    const nextIdx = (phaseIdx + 1) % pattern.length;
    if (nextIdx === 0) {
      breathCycles++;
      const cycleEl = document.getElementById('cycle-count'); if(cycleEl) cycleEl.textContent = breathCycles;
    }
    runBreathPhase(nextIdx);
  }, phase.dur);
}

function saveGratitude() {
  const g1 = document.getElementById('gratitude-1');
  const g2 = document.getElementById('gratitude-2');
  const g3 = document.getElementById('gratitude-3');
  const items = [g1,g2,g3].map(el => el ? el.value.trim().slice(0,200) : '').filter(Boolean);
  if (!items.length) { showToast('Write at least one gratitude item.','error'); return; }
  const entries = getStorage('gratitude_entries',[]);
  entries.unshift({ date: todayStr(), items, timestamp: Date.now() });
  setStorage('gratitude_entries', entries.slice(0,100));
  if(g1) g1.value=''; if(g2) g2.value=''; if(g3) g3.value='';
  renderGratitudeHistory(); showToast('Gratitude saved!','success');
}

function renderGratitudeHistory() {
  const el = document.getElementById('gratitude-history');
  if (!el) return;
  const entries = getStorage('gratitude_entries',[]).slice(0,10);
  if (!entries.length) { el.innerHTML = ''; return; }
  el.innerHTML = entries.map(e => `
    <div class="gratitude-entry">
      <div class="gratitude-entry-date">${sanitize(formatDateDisplay(e.date))}</div>
      ${e.items.map(item => `<div class="gratitude-entry-item">${sanitize(item)}</div>`).join('')}
    </div>`).join('');
}

const CHALLENGES = [
  { icon:'directions_walk', title:'10-min Walk', desc:'Step outside for fresh air' },
  { icon:'local_drink', title:'Drink Water', desc:'8 glasses today' },
  { icon:'menu_book', title:'Read 10 Min', desc:'Any book or article' },
  { icon:'self_improvement', title:'Meditate', desc:'5 minutes mindfulness' },
  { icon:'phone_disabled', title:'Screen Break', desc:'30 mins without phone' },
  { icon:'night_shelter', title:'Sleep Early', desc:'Bed by 10 PM' },
  { icon:'fitness_center', title:'Exercise', desc:'15 mins movement' },
  { icon:'edit_note', title:'Journaling', desc:'Write 3 sentences' }
];

function initChallenges() {
  const grid = document.getElementById('challenges-grid');
  if (!grid) return;
  const done = getStorage('challenges_done_' + todayStr(), []);
  grid.innerHTML = CHALLENGES.map((c,i) => `
    <div class="challenge-item${done.includes(i)?' done':''}" data-ci="${i}" role="listitem" tabindex="0" aria-pressed="${done.includes(i)}">
      <div class="challenge-icon"><span class="material-icons-round" aria-hidden="true">${sanitize(c.icon)}</span></div>
      <div class="challenge-title">${sanitize(c.title)}</div>
      <div class="challenge-desc">${sanitize(c.desc)}</div>
    </div>`).join('');
  grid.querySelectorAll('.challenge-item').forEach(item => {
    const toggle = () => {
      const ci = parseInt(item.dataset.ci);
      const done = getStorage('challenges_done_' + todayStr(), []);
      const idx = done.indexOf(ci);
      if (idx >= 0) done.splice(idx,1); else done.push(ci);
      setStorage('challenges_done_' + todayStr(), done);
      item.classList.toggle('done', done.includes(ci));
      item.setAttribute('aria-pressed', String(done.includes(ci)));
    };
    item.addEventListener('click', toggle);
    item.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' ') toggle(); });
  });
}

const REFLECTION_PROMPTS = [
  'What is one thing you learned about yourself today?',
  'What are three small wins from this week?',
  'Who made a positive impact on your life recently, and why?',
  'What challenge are you most proud of overcoming?',
  'If today were perfect, what would it look like?',
  'What emotion have you been feeling most this week?',
  'What is one habit you want to build this month?',
  'When did you last feel truly at peace?',
  'What would you tell your past self from one year ago?',
  'What does success mean to you right now?',
  'What is draining your energy, and how can you reduce it?',
  'What are you most grateful for in your life today?'
];
let currentPromptIdx = 0;

function initReflectionPrompts() {
  currentPromptIdx = Math.floor(Math.random() * REFLECTION_PROMPTS.length);
  const el = document.getElementById('reflection-prompt');
  if (el) el.textContent = REFLECTION_PROMPTS[currentPromptIdx];
  document.getElementById('new-prompt') && document.getElementById('new-prompt').addEventListener('click', () => {
    currentPromptIdx = (currentPromptIdx + 1) % REFLECTION_PROMPTS.length;
    const el = document.getElementById('reflection-prompt');
    if (el) el.textContent = REFLECTION_PROMPTS[currentPromptIdx];
  });
}

function initInsights() {
  const itabs = document.querySelectorAll('.tab[data-itab]');
  itabs.forEach(t => {
    t.addEventListener('click', () => {
      itabs.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
      document.querySelectorAll('.itab-panel').forEach(p => p.classList.remove('active'));
      t.classList.add('active'); t.setAttribute('aria-selected','true');
      const panel = document.getElementById('itab-' + t.dataset.itab);
      if (panel) panel.classList.add('active');
      renderInsights();
    });
  });
  document.getElementById('generate-report') && document.getElementById('generate-report').addEventListener('click', generateReport);
}

function renderInsights() {
  const checkins = getStorage('checkins',[]);
  renderInsightsSummary(checkins);
  renderMoodChart(checkins);
  renderMoodChart30(checkins);
  renderMoodDistChart(checkins);
  renderHabitChart();
  renderWellnessStreaks();
  renderEmotionalPatterns(checkins);
  renderWeeklyAverages(checkins);
}

function renderInsightsSummary(checkins) {
  const el = document.getElementById('insights-summary');
  if (!el) return;
  const streak = calcCheckinStreak(checkins);
  const habits = getStorage('habits',[]);
  const today = todayStr();
  let habitsDoneToday = 0;
  habits.forEach(h => { if(h.days && h.days[today]) habitsDoneToday++; });
  const sessions = getStorage('pomodoro_sessions',[]);
  const todaySessions = sessions.filter(s => s.date === today).length;
  const journals = getStorage('journals',{});
  const avgMood = checkins.length ? (checkins.reduce((s,c)=>s+c.mood,0)/checkins.length).toFixed(1) : '—';
  el.innerHTML = `
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">local_fire_department</span></span><div class="summary-value">${streak}</div><div class="summary-label">Day Streak</div></div>
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">mood</span></span><div class="summary-value">${avgMood}</div><div class="summary-label">Avg Mood</div></div>
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">check_circle</span></span><div class="summary-value">${habitsDoneToday}/${habits.length}</div><div class="summary-label">Habits Today</div></div>
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">timer</span></span><div class="summary-value">${todaySessions}</div><div class="summary-label">Focus Today</div></div>
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">menu_book</span></span><div class="summary-value">${Object.keys(journals).length}</div><div class="summary-label">Journal Entries</div></div>
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">event_note</span></span><div class="summary-value">${checkins.length}</div><div class="summary-label">Total Check-ins</div></div>`;
}

function renderMoodChart(checkins) {
  const canvas = document.getElementById('mood-chart');
  if (!canvas) return;
  const days = [];
  for (let i=6; i>=0; i--) { const d=new Date(); d.setDate(d.getDate()-i); days.push(d.toISOString().slice(0,10)); }
  const labels = days.map(d => { const dt=new Date(d+'T12:00:00'); return dt.toLocaleDateString(undefined,{weekday:'short'}); });
  const data = days.map(d => { const c=checkins.find(x=>x.date===d); return c ? c.mood : null; });
  drawLineChart(canvas, labels, data, 'Mood', MOOD_COLORS[3]);
}

function renderMoodChart30(checkins) {
  const canvas = document.getElementById('mood-chart-30');
  if (!canvas) return;
  const days = [];
  for (let i=29; i>=0; i--) { const d=new Date(); d.setDate(d.getDate()-i); days.push(d.toISOString().slice(0,10)); }
  const labels = days.map((d,i) => i%5===0 ? new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'}) : '');
  const data = days.map(d => { const c=checkins.find(x=>x.date===d); return c ? c.mood : null; });
  drawLineChart(canvas, labels, data, '30-Day Mood', MOOD_COLORS[4]);
}

function renderMoodDistChart(checkins) {
  const canvas = document.getElementById('mood-dist-chart');
  if (!canvas) return;
  const counts = [0,0,0,0,0,0];
  checkins.forEach(c => { if(c.mood>=1&&c.mood<=5) counts[c.mood]++; });
  const labels = ['','Struggling','Low','Okay','Good','Amazing'];
  const data = counts.slice(1);
  const colors = MOOD_COLORS.slice(1);
  drawBarChart(canvas, labels.slice(1), data, colors);
}

function drawLineChart(canvas, labels, data, label, color) {
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 600;
  const H = canvas.offsetHeight || 200;
  canvas.width = W; canvas.height = H;
  const pad = { top:20, right:20, bottom:30, left:30 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  ctx.clearRect(0,0,W,H);
  const isDark = document.documentElement.getAttribute('data-theme')==='dark';
  const textColor = isDark ? '#CAC4D0' : '#49454F';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  for (let y=1; y<=5; y++) {
    const yPos = pad.top + chartH - ((y-1)/4)*chartH;
    ctx.strokeStyle = gridColor; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pad.left, yPos); ctx.lineTo(pad.left+chartW, yPos); ctx.stroke();
    ctx.fillStyle = textColor; ctx.font='10px DM Sans,sans-serif'; ctx.textAlign='right';
    ctx.fillText(MOOD_LABELS[y]||y, pad.left-4, yPos+4);
  }
  const validPts = data.map((v,i) => v!==null ? { x: pad.left+(i/(labels.length-1))*chartW, y: pad.top+chartH-((v-1)/4)*chartH } : null);
  ctx.strokeStyle = color; ctx.lineWidth=2.5; ctx.lineJoin='round';
  let started=false;
  ctx.beginPath();
  validPts.forEach((pt,i) => {
    if (!pt) return;
    if (!started) { ctx.moveTo(pt.x, pt.y); started=true; } else { ctx.lineTo(pt.x, pt.y); }
  });
  ctx.stroke();
  validPts.forEach(pt => {
    if (!pt) return;
    ctx.fillStyle=color; ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(pt.x, pt.y, 2, 0, Math.PI*2); ctx.fill();
  });
  ctx.fillStyle=textColor; ctx.font='10px DM Sans,sans-serif'; ctx.textAlign='center';
  labels.forEach((l,i) => {
    if (!l) return;
    const x = pad.left+(i/(labels.length-1))*chartW;
    ctx.fillText(l, x, H-5);
  });
}

function drawBarChart(canvas, labels, data, colors) {
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 300;
  const H = canvas.offsetHeight || 300;
  canvas.width = W; canvas.height = H;
  const pad = { top:20, right:20, bottom:40, left:30 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  ctx.clearRect(0,0,W,H);
  const isDark = document.documentElement.getAttribute('data-theme')==='dark';
  const textColor = isDark ? '#CAC4D0' : '#49454F';
  const max = Math.max(...data, 1);
  const barW = chartW / (labels.length * 1.5);
  const gap = (chartW - barW*labels.length) / (labels.length+1);
  data.forEach((v,i) => {
    const x = pad.left + gap + i*(barW+gap);
    const bH = (v/max)*chartH;
    const y = pad.top + chartH - bH;
    ctx.fillStyle = colors[i] || '#6750A4';
    ctx.beginPath();
    const r = Math.min(6, barW/2);
    ctx.moveTo(x+r, y); ctx.lineTo(x+barW-r, y);
    ctx.arcTo(x+barW, y, x+barW, y+r, r); ctx.lineTo(x+barW, y+bH);
    ctx.lineTo(x, y+bH); ctx.arcTo(x, y, x+r, y, r); ctx.closePath();
    ctx.fill();
    ctx.fillStyle=textColor; ctx.font='10px DM Sans,sans-serif'; ctx.textAlign='center';
    if (v>0) ctx.fillText(v, x+barW/2, y-4);
    ctx.fillText(labels[i], x+barW/2, pad.top+chartH+15);
  });
}

function renderHabitChart() {
  const canvas = document.getElementById('habit-chart');
  if (!canvas) return;
  const habits = getStorage('habits',[]);
  const weekDays = getCurrentWeekDates();
  const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const data = weekDays.map(d => habits.filter(h=>h.days&&h.days[d]).length);
  drawBarChart(canvas, labels, data, weekDays.map(()=>'#6750A4'));
}

function renderWellnessStreaks() {
  const el = document.getElementById('wellness-streaks');
  if (!el) return;
  const checkins = getStorage('checkins',[]);
  const habits = getStorage('habits',[]);
  const journals = getStorage('journals',{});
  const checkStreak = calcCheckinStreak(checkins);
  const journalDates = Object.keys(journals).sort().reverse();
  let journalStreak=0, expected=todayStr();
  for(const d of journalDates) {
    if(d===expected){journalStreak++;const dt=new Date(d+'T12:00:00');dt.setDate(dt.getDate()-1);expected=dt.toISOString().slice(0,10);}else break;
  }
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:0.75rem;">
      <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
        <span class="material-icons-round" style="color:#E65100;font-size:1.5rem;" aria-hidden="true">local_fire_department</span>
        <div><div style="font-weight:700;color:var(--md-on-surface)">${checkStreak} day check-in streak</div><div style="font-size:0.78rem;color:var(--md-on-surface-variant)">Daily mood tracking</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
        <span class="material-icons-round" style="color:var(--md-primary);font-size:1.5rem;" aria-hidden="true">menu_book</span>
        <div><div style="font-weight:700;color:var(--md-on-surface)">${journalStreak} day journal streak</div><div style="font-size:0.78rem;color:var(--md-on-surface-variant)">Consistent journaling</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
        <span class="material-icons-round" style="color:var(--md-success);font-size:1.5rem;" aria-hidden="true">check_circle</span>
        <div><div style="font-weight:700;color:var(--md-on-surface)">${habits.length} habits tracked</div><div style="font-size:0.78rem;color:var(--md-on-surface-variant)">Active habits this week</div></div>
      </div>
    </div>`;
}

function renderEmotionalPatterns(checkins) {
  const el = document.getElementById('emotional-patterns');
  if (!el) return;
  if (checkins.length < 3) { el.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:0.875rem;">Log more check-ins to see emotional patterns.</p>'; return; }
  const moodCounts = [0,0,0,0,0,0];
  checkins.forEach(c => { if(c.mood>=1&&c.mood<=5) moodCounts[c.mood]++; });
  const dominant = moodCounts.slice(1).indexOf(Math.max(...moodCounts.slice(1)))+1;
  const avgStress = checkins.length ? (checkins.reduce((s,c)=>s+(c.stress||5),0)/checkins.length).toFixed(1) : '—';
  const energyCounts = { low:0, medium:0, high:0 };
  checkins.forEach(c => { if(c.energy&&energyCounts[c.energy]!==undefined) energyCounts[c.energy]++; });
  const domEnergy = Object.entries(energyCounts).sort((a,b)=>b[1]-a[1])[0][0];
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:0.75rem;">
      <div style="padding:0.875rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
        <p style="font-size:0.85rem;color:var(--md-on-surface-variant);margin-bottom:0.375rem;">Most frequent mood</p>
        <p style="font-weight:700;color:var(--md-primary);font-size:1rem;">${sanitize(MOOD_LABELS[dominant]||'—')}</p>
      </div>
      <div style="padding:0.875rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
        <p style="font-size:0.85rem;color:var(--md-on-surface-variant);margin-bottom:0.375rem;">Average stress level</p>
        <p style="font-weight:700;color:var(--md-on-surface);font-size:1rem;">${avgStress}/10</p>
      </div>
      <div style="padding:0.875rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
        <p style="font-size:0.85rem;color:var(--md-on-surface-variant);margin-bottom:0.375rem;">Typical energy level</p>
        <p style="font-weight:700;color:var(--md-on-surface);font-size:1rem;text-transform:capitalize;">${sanitize(domEnergy)}</p>
      </div>
    </div>`;
}

function renderWeeklyAverages(checkins) {
  const el = document.getElementById('weekly-averages');
  if (!el) return;
  if (checkins.length < 3) { el.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:0.875rem;">Not enough data yet.</p>'; return; }
  const weeks = {};
  checkins.forEach(c => {
    const d = new Date(c.date+'T12:00:00');
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0,10);
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(c.mood);
  });
  const rows = Object.entries(weeks).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,6);
  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:0.5rem;">` + rows.map(([week, moods]) => {
    const avg = (moods.reduce((s,m)=>s+m,0)/moods.length).toFixed(1);
    const pct = ((avg-1)/4)*100;
    return `<div style="padding:0.75rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
      <div style="display:flex;justify-content:space-between;margin-bottom:0.375rem;">
        <span style="font-size:0.8rem;color:var(--md-on-surface-variant)">Week of ${sanitize(formatDateDisplay(week))}</span>
        <span style="font-weight:700;color:var(--md-primary)">${avg}/5</span>
      </div>
      <div style="height:6px;background:var(--md-outline-variant);border-radius:3px;">
        <div style="height:100%;width:${pct}%;background:var(--md-primary);border-radius:3px;transition:width 0.5s ease;"></div>
      </div>
    </div>`;
  }).join('') + '</div>';
}

function generateReport() {
  const periodEl = document.getElementById('report-period');
  const nameEl = document.getElementById('report-name');
  const period = periodEl ? parseInt(periodEl.value) : 30;
  const studentName = nameEl ? nameEl.value.trim().slice(0,100) : '';
  const checkins = getStorage('checkins',[]);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-period);
  const filtered = checkins.filter(c => new Date(c.date+'T12:00:00') >= cutoff);
  if (!filtered.length) { showToast('No data for selected period.','error'); return; }
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(20); doc.setFont('helvetica','bold');
    doc.text('StudyHub Wellness Report', 105, y, {align:'center'}); y+=10;
    doc.setFontSize(11); doc.setFont('helvetica','normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, y, {align:'center'}); y+=6;
    if (studentName) { doc.text(`Student: ${studentName}`, 105, y, {align:'center'}); y+=6; }
    doc.text(`Period: Last ${period} days`, 105, y, {align:'center'}); y+=12;
    doc.setDrawColor(103,80,164); doc.setLineWidth(0.5); doc.line(20, y, 190, y); y+=8;
    const avgMood = (filtered.reduce((s,c)=>s+c.mood,0)/filtered.length).toFixed(2);
    const avgStress = (filtered.reduce((s,c)=>s+(c.stress||5),0)/filtered.length).toFixed(2);
    doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text('Summary Statistics', 20, y); y+=8;
    doc.setFontSize(11); doc.setFont('helvetica','normal');
    doc.text(`Total Check-ins: ${filtered.length}`, 25, y); y+=6;
    doc.text(`Average Mood: ${avgMood}/5 (${MOOD_LABELS[Math.round(parseFloat(avgMood))]||''})`, 25, y); y+=6;
    doc.text(`Average Stress Level: ${avgStress}/10`, 25, y); y+=6;
    const streak = calcCheckinStreak(checkins);
    doc.text(`Current Check-in Streak: ${streak} days`, 25, y); y+=10;
    doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text('Mood Distribution', 20, y); y+=8;
    doc.setFontSize(11); doc.setFont('helvetica','normal');
    [1,2,3,4,5].forEach(m => {
      const cnt = filtered.filter(c=>c.mood===m).length;
      const pct = ((cnt/filtered.length)*100).toFixed(0);
      doc.text(`${MOOD_LABELS[m]}: ${cnt} (${pct}%)`, 25, y); y+=6;
    });
    y+=4;
    const energyCounts = {low:0,medium:0,high:0};
    filtered.forEach(c=>{if(c.energy&&energyCounts[c.energy]!==undefined)energyCounts[c.energy]++;});
    doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text('Energy & Sleep Patterns', 20, y); y+=8;
    doc.setFontSize(11); doc.setFont('helvetica','normal');
    Object.entries(energyCounts).forEach(([k,v])=>{if(v>0){doc.text(`${k.charAt(0).toUpperCase()+k.slice(1)} energy: ${v} days`,25,y);y+=6;}});
    y+=4;
    doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text('Recent Reflections', 20, y); y+=8;
    doc.setFontSize(10); doc.setFont('helvetica','normal');
    filtered.slice(-5).reverse().forEach(c => {
      if (c.thoughts && y < 260) {
        doc.text(`${c.date}: "${c.thoughts.slice(0,80)}${c.thoughts.length>80?'…':''}"`, 25, y, {maxWidth:165}); y+=10;
      }
    });
    y+=4;
    if (y > 260) { doc.addPage(); y=20; }
    doc.setDrawColor(200,200,200); doc.line(20,y,190,y); y+=6;
    doc.setFontSize(8); doc.setFont('helvetica','italic');
    doc.text('DISCLAIMER: This report is a preliminary wellness assessment based on self-reported data. It is not a medical diagnosis and should be interpreted by qualified healthcare professionals.',20,y,{maxWidth:170}); y+=10;
    doc.text('StudyHub — All data stored locally. No external servers.',20,y);
    const fname = `wellness-report-${todayStr()}.pdf`;
    doc.save(fname);
    showToast('Report downloaded!','success');
  } catch(e) {
    showToast('Error generating report. Ensure jsPDF is loaded.','error');
    console.error(e);
  }
}

function initSettings() {
  const nameInput = document.getElementById('settings-name');
  const savedName = getStorage('profile_name','');
  const savedGender = getStorage('profile_gender','male');
  if (nameInput) nameInput.value = savedName;
  document.querySelectorAll('.gender-btn').forEach(btn => {
    const active = btn.dataset.gender === savedGender;
    btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', String(active));
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gender-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
    });
  });
  document.getElementById('save-profile') && document.getElementById('save-profile').addEventListener('click', () => {
    const name = nameInput ? nameInput.value.trim().slice(0,100) : '';
    const genderBtn = document.querySelector('.gender-btn.active');
    const gender = genderBtn ? genderBtn.dataset.gender : 'male';
    setStorage('profile_name', name);
    setStorage('profile_gender', gender);
    showToast('Profile saved!','success');
    updateHomeDashboard();
  });
  document.querySelectorAll('.theme-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme); updateThemeBtns(btn.dataset.theme);
    });
  });
  document.getElementById('export-data') && document.getElementById('export-data').addEventListener('click', () => {
    const data = {};
    ['checkins','habits','journals','notes','todos','calendarEvents','pomodoro_sessions','gratitude_entries','flashcard_decks','profile_name','profile_gender','theme'].forEach(k => {
      data[k] = getStorage(k, null);
    });
    const blob = new Blob([JSON.stringify(data, null, 2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`studyhub-backup-${todayStr()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast('Data exported!','success');
  });
  document.getElementById('clear-data') && document.getElementById('clear-data').addEventListener('click', () => {
    if (!confirm('Clear ALL data? This cannot be undone.')) return;
    localStorage.clear();
    showToast('All data cleared.','');
    setTimeout(() => location.reload(), 1000);
  });
  document.getElementById('restart-onboarding') && document.getElementById('restart-onboarding').addEventListener('click', () => {
    setStorage('onboarding_done', false);
    if (initOnboarding.restart) initOnboarding.restart();
    else location.reload();
  });
}

let dpCallback = null, dpCurrentDate = null;

function initDatePicker() {
  document.getElementById('dp-cancel') && document.getElementById('dp-cancel').addEventListener('click', closeDatePicker);
  document.getElementById('dp-ok') && document.getElementById('dp-ok').addEventListener('click', () => {
    if (dpCurrentDate && dpCallback) dpCallback(dpCurrentDate);
    closeDatePicker();
  });
  document.getElementById('dp-prev-month') && document.getElementById('dp-prev-month').addEventListener('click', () => {
    const d = new Date(dpCurrentDate+'T12:00:00'); d.setMonth(d.getMonth()-1);
    dpCurrentDate = d.toISOString().slice(0,10); renderDPCalendar();
  });
  document.getElementById('dp-next-month') && document.getElementById('dp-next-month').addEventListener('click', () => {
    const d = new Date(dpCurrentDate+'T12:00:00'); d.setMonth(d.getMonth()+1);
    dpCurrentDate = d.toISOString().slice(0,10); renderDPCalendar();
  });
  document.getElementById('dp-month-year-btn') && document.getElementById('dp-month-year-btn').addEventListener('click', toggleDPYearView);
  // FIX: dp-toggle-mode button (pencil icon in date picker header) had no event listener
  document.getElementById('dp-toggle-mode') && document.getElementById('dp-toggle-mode').addEventListener('click', toggleDPYearView);
  const dialog = document.getElementById('date-picker-dialog');
  const scrim = dialog && dialog.querySelector('.picker-scrim');
  scrim && scrim.addEventListener('click', closeDatePicker);
}

function openDatePicker(initialDate, callback) {
  dpCurrentDate = sanitizeDate(initialDate) || todayStr();
  dpCallback = callback;
  const dialog = document.getElementById('date-picker-dialog');
  if (!dialog) return;
  dialog.setAttribute('aria-hidden','false');
  renderDPCalendar();
}

function closeDatePicker() {
  const dialog = document.getElementById('date-picker-dialog');
  if (dialog) dialog.setAttribute('aria-hidden','true');
  dpCallback = null;
}

function renderDPCalendar() {
  const d = new Date(dpCurrentDate+'T12:00:00');
  const year = d.getFullYear(), month = d.getMonth();
  const labelEl = document.getElementById('dp-month-year-label');
  if (labelEl) labelEl.textContent = d.toLocaleDateString(undefined,{month:'long',year:'numeric'});
  const selectedLabel = document.getElementById('dp-selected-label');
  if (selectedLabel) selectedLabel.textContent = formatDateDisplay(dpCurrentDate);
  const daysEl = document.getElementById('dp-days');
  if (!daysEl) return;
  const fd = new Date(year, month, 1).getDay();
  const dim = new Date(year, month+1, 0).getDate();
  const today = todayStr();
  let html = '';
  for (let i=0; i<fd; i++) html += `<div></div>`;
  for (let day=1; day<=dim; day++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isSel = ds===dpCurrentDate, isToday=ds===today;
    html += `<button class="dp-day${isSel?' selected':''}${isToday&&!isSel?' today':''}" data-date="${ds}" type="button" aria-label="${ds}">${day}</button>`;
  }
  daysEl.innerHTML = html;
  daysEl.querySelectorAll('.dp-day').forEach(btn => {
    btn.addEventListener('click', () => { dpCurrentDate=btn.dataset.date; renderDPCalendar(); });
  });
  document.getElementById('dp-calendar-view').style.display='';
  document.getElementById('dp-year-view').style.display='none';
}

function toggleDPYearView() {
  const cal = document.getElementById('dp-calendar-view');
  const yr = document.getElementById('dp-year-view');
  if (!cal||!yr) return;
  if (yr.style.display==='none'||!yr.style.display) {
    cal.style.display='none'; yr.style.display='';
    renderDPYearGrid();
  } else {
    yr.style.display='none'; cal.style.display='';
  }
}

function renderDPYearGrid() {
  const grid = document.getElementById('dp-year-grid');
  if (!grid) return;
  const curYear = new Date(dpCurrentDate+'T12:00:00').getFullYear();
  const thisYear = new Date().getFullYear();
  let html='';
  for(let y=thisYear-10; y<=thisYear+10; y++) {
    html+=`<button class="dp-year-btn${y===curYear?' selected':''}${y===thisYear?' current-year':''}" data-y="${y}" type="button">${y}</button>`;
  }
  grid.innerHTML=html;
  grid.querySelectorAll('.dp-year-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const d=new Date(dpCurrentDate+'T12:00:00'); d.setFullYear(parseInt(btn.dataset.y));
      dpCurrentDate=d.toISOString().slice(0,10);
      document.getElementById('dp-year-view').style.display='none';
      document.getElementById('dp-calendar-view').style.display='';
      renderDPCalendar();
    });
  });
  setTimeout(()=>{const sel=grid.querySelector('.selected');if(sel)sel.scrollIntoView({block:'center'});},50);
}

let tpCallback=null, tpHour=12, tpMinute=0, tpPeriod='AM', tpMode='hour';
let tpInputMode=false;


function tpSmartPeriod(hour12, minute) {
  const now   = new Date();
  const nowM  = now.getHours() * 60 + now.getMinutes();
  // Convert 12-hour to 24-hour bases
  const amH   = hour12 === 12 ? 0 : hour12;
  const pmH   = hour12 === 12 ? 12 : hour12 + 12;
  const amM   = amH * 60 + minute;
  const pmM   = pmH * 60 + minute;

  // Prefer the upcoming time; if both are in the past, prefer the sooner past
  function dist(target) {
    let d = target - nowM;
    if (d < 0) d += 24 * 60;
    return d;
  }
  return dist(amM) <= dist(pmM) ? 'AM' : 'PM';
}

function tpParseInput(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim().toUpperCase();

  let hasPM = /PM$/.test(s);
  let hasAM = /AM$/.test(s);
  const stripped = s.replace(/[AP]M$/, '').trim();

  let h, m;

  // "HH:MM" or "H:MM"
  const colonMatch = stripped.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    h = parseInt(colonMatch[1], 10);
    m = parseInt(colonMatch[2], 10);
  } else {
    // "HHMM" or "HMM" or "HH" or "H"
    const digits = stripped.replace(/\D/g, '');
    if (digits.length === 4) {
      h = parseInt(digits.slice(0, 2), 10);
      m = parseInt(digits.slice(2), 10);
    } else if (digits.length === 3) {
      h = parseInt(digits.slice(0, 1), 10);
      m = parseInt(digits.slice(1), 10);
    } else if (digits.length === 1 || digits.length === 2) {
      h = parseInt(digits, 10);
      m = 0;
    } else {
      return null;
    }
  }

  if (isNaN(h) || isNaN(m) || m < 0 || m > 59) return null;

  if (!hasAM && !hasPM) {
    if (h >= 0 && h <= 23) {
      hasPM = h >= 12;
      hasAM = !hasPM;
      // Leave h as-is for conversion below
    } else {
      return null;
    }
  }

  if (hasAM || hasPM) {
    if (h === 0) {
      // 00:xx with no suffix interpreted as 12:xx AM
      h = 12; hasPM = false; hasAM = true;
    } else if (h > 23) {
      return null;
    }
    if (h > 12) {
      // 24-hour given with suffix (e.g. "23:00 PM") — suffix wins, convert
      h = h % 12 || 12;
    }
    if (h === 0) h = 12;
  }

  if (h < 1 || h > 12) return null;

  const period = hasPM ? 'PM' : (hasAM ? 'AM' : null);
  return { hour: h, minute: m, period };
}

function tpTo24(hour12, minute, period) {
  let h = period === 'AM' ? (hour12 === 12 ? 0 : hour12) : (hour12 === 12 ? 12 : hour12 + 12);
  return `${String(h).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
}

function tpStartManualInput(field) {
  const segId = field === 'hour' ? 'tp-hour-btn' : 'tp-min-btn';
  const seg   = document.getElementById(segId);
  if (!seg) return;

  if (seg.querySelector('.tp-seg-input')) return;

  tpInputMode = true;
  const current = field === 'hour' ? String(tpHour) : String(tpMinute).padStart(2, '0');

  const input = document.createElement('input');
  input.type       = 'text';
  input.inputMode  = 'numeric';
  input.pattern    = '[0-9]*';
  input.maxLength  = field === 'hour' ? 2 : 2;
  input.className  = 'tp-seg-input';
  input.value      = current;
  input.setAttribute('aria-label', field === 'hour' ? 'Enter hour' : 'Enter minute');
  input.setAttribute('autocomplete', 'off');

  const span = seg.querySelector('span');
  if (span) span.style.display = 'none';
  seg.appendChild(input);
  seg.classList.add('editing');

  requestAnimationFrame(() => { input.focus(); input.select(); });

  function commit() {
    if (!tpInputMode) return;
    tpInputMode = false;
    const raw = input.value.trim();
    cleanup();

    if (field === 'hour') {
      // Try full time parse first (e.g. user typed "1330" or "11:30 PM")
      const parsed = tpParseInput(raw);
      if (parsed) {
        tpHour   = parsed.hour;
        tpMinute = parsed.minute;
        if (parsed.period) {
          tpPeriod = parsed.period;
        } else {
          tpPeriod = tpSmartPeriod(tpHour, tpMinute);
        }
      } else {
        // Bare hour number (1–12 or 1–23)
        let v = parseInt(raw, 10);
        if (!isNaN(v)) {
          if (v >= 13 && v <= 23) {
            tpPeriod = 'PM';
            v = v % 12 || 12;
          } else if (v === 0) {
            tpPeriod = 'AM';
            v = 12;
          } else if (v >= 1 && v <= 12) {
            tpPeriod = tpSmartPeriod(v, tpMinute);
          }
          tpHour = (v >= 1 && v <= 12) ? v : tpHour;
        }
      }
    } else {
      // Minute field — accept 0–59
      let v = parseInt(raw, 10);
      if (!isNaN(v) && v >= 0 && v <= 59) tpMinute = v;
    }
    updateTPSegments();
    updateTPPeriod();
    updateTPLabel();
    renderTPClock();
  }

  function cancel() {
    tpInputMode = false;
    cleanup();
    updateTPSegments();
  }

  function cleanup() {
    if (input.parentNode) input.parentNode.removeChild(input);
    seg.classList.remove('editing');
    if (span) span.style.display = '';
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  input.addEventListener('blur', () => { if (tpInputMode) commit(); });
  input.addEventListener('click', e => e.stopPropagation());
}

function initTimePicker() {
  document.getElementById('tp-cancel')&&document.getElementById('tp-cancel').addEventListener('click',closeTimePicker);
  document.getElementById('tp-ok')&&document.getElementById('tp-ok').addEventListener('click',()=>{
    const timeStr = tpTo24(tpHour, tpMinute, tpPeriod);
    if(tpCallback)tpCallback(timeStr);
    closeTimePicker();
  });

  document.getElementById('tp-hour-btn')&&document.getElementById('tp-hour-btn').addEventListener('click', e => {
    if (e.target.classList && e.target.classList.contains('tp-seg-input')) return;
    if (tpMode === 'hour') {
      // Already in hour mode, open manual input
      tpStartManualInput('hour');
    } else {
      tpMode = 'hour';
      renderTPClock();
      updateTPSegments();
    }
  });

  document.getElementById('tp-min-btn')&&document.getElementById('tp-min-btn').addEventListener('click', e => {
    if (e.target.classList && e.target.classList.contains('tp-seg-input')) return;
    if (tpMode === 'minute') {
      tpStartManualInput('minute');
    } else {
      tpMode = 'minute';
      renderTPClock();
      updateTPSegments();
    }
  });

  document.getElementById('tp-am')&&document.getElementById('tp-am').addEventListener('click',()=>{
    if (tpPeriod !== 'AM') {
      tpPeriod = 'AM';
      updateTPPeriod();
      updateTPLabel();
    }
  });

  document.getElementById('tp-pm')&&document.getElementById('tp-pm').addEventListener('click',()=>{
    if (tpPeriod !== 'PM') {
      tpPeriod = 'PM';
      updateTPPeriod();
      updateTPLabel();
    }
  });

  const dialog=document.getElementById('time-picker-dialog');
  const scrim=dialog&&dialog.querySelector('.picker-scrim');
  scrim&&scrim.addEventListener('click',closeTimePicker);
}

function openTimePicker(initialTime, callback) {
  tpCallback=callback;
  tpInputMode=false;
  if(initialTime&&/^\d{2}:\d{2}$/.test(initialTime)){
    let [h,m]=initialTime.split(':').map(Number);
    tpPeriod=h>=12?'PM':'AM';
    tpHour=h%12||12;
    tpMinute=m;
  } else {
    // No initial time — default to now with smart AM/PM
    const now=new Date();
    tpHour=now.getHours()%12||12;
    tpMinute=now.getMinutes();
    tpPeriod=now.getHours()>=12?'PM':'AM';
  }
  tpMode='hour';
  const dialog=document.getElementById('time-picker-dialog');
  if(dialog){dialog.style.display='';dialog.setAttribute('aria-hidden','false');}
  updateTPSegments(); updateTPPeriod(); updateTPLabel(); renderTPClock();
}

function closeTimePicker() {
  tpInputMode=false;
  document.querySelectorAll('.tp-seg-input').forEach(el=>{
    const seg=el.parentNode;
    el.remove();
    if(seg){seg.classList.remove('editing'); const sp=seg.querySelector('span'); if(sp)sp.style.display='';}
  });
  const dialog=document.getElementById('time-picker-dialog');
  if(dialog)dialog.setAttribute('aria-hidden','true');
  tpCallback=null;
}

function updateTPLabel() {
  const el=document.getElementById('tp-selected-label');
  if(el)el.textContent=`${tpHour}:${String(tpMinute).padStart(2,'0')} ${tpPeriod}`;
}

function updateTPSegments() {
  const hBtn=document.getElementById('tp-hour-btn'), mBtn=document.getElementById('tp-min-btn');
  if(hBtn){hBtn.classList.toggle('active',tpMode==='hour');const sp=hBtn.querySelector('span');if(sp)sp.textContent=tpHour;}
  if(mBtn){mBtn.classList.toggle('active',tpMode==='minute');const sp=mBtn.querySelector('span');if(sp)sp.textContent=String(tpMinute).padStart(2,'0');}
  // Update hint: if in input mode show confirm hint, otherwise show tap-to-type
  const hint=document.getElementById('tp-input-hint');
  if(hint){hint.textContent=tpInputMode?'Enter to confirm, Esc to cancel':'Tap a field again to type';}
}

function updateTPPeriod() {
  const amBtn=document.getElementById('tp-am'),pmBtn=document.getElementById('tp-pm');
  if(amBtn){amBtn.classList.toggle('active',tpPeriod==='AM');amBtn.setAttribute('aria-pressed',String(tpPeriod==='AM'));}
  if(pmBtn){pmBtn.classList.toggle('active',tpPeriod==='PM');pmBtn.setAttribute('aria-pressed',String(tpPeriod==='PM'));}
}

function renderTPClock() {
  const container=document.getElementById('tp-clock-numbers');
  const hand=document.getElementById('tp-clock-hand');
  const clock=document.getElementById('tp-clock');
  if(!container||!hand||!clock)return;
  const r=112;
  container.innerHTML='';
  if(tpMode==='hour'){
    const nums=[12,1,2,3,4,5,6,7,8,9,10,11];
    nums.forEach((n,i)=>{
      const angle=(i/12)*2*Math.PI - Math.PI/2;
      const x=112+r*Math.cos(angle), y=112+r*Math.sin(angle);
      const btn=document.createElement('button');
      btn.className='tp-number'+(n===tpHour?' selected':'');
      btn.style.left=x+'px'; btn.style.top=y+'px';
      btn.textContent=n; btn.type='button';
      btn.addEventListener('click',()=>{tpHour=n;tpMode='minute';renderTPClock();updateTPSegments();updateTPLabel();});
      container.appendChild(btn);
    });
    const idx=tpHour===12?0:tpHour;
    const angle=(idx/12)*360;
    hand.style.height=(r-12)+'px'; hand.style.top=(112-(r-12))+'px'; hand.style.left='111px';
    hand.style.transform=`rotate(${angle}deg)`;
  } else {
    for(let m=0;m<60;m+=5){
      const angle=(m/60)*2*Math.PI-Math.PI/2;
      const x=112+r*Math.cos(angle), y=112+r*Math.sin(angle);
      const btn=document.createElement('button');
      btn.className='tp-number'+(m===tpMinute?' selected':'');
      btn.style.left=x+'px'; btn.style.top=y+'px';
      btn.textContent=String(m).padStart(2,'0'); btn.type='button';
      btn.addEventListener('click',()=>{tpMinute=m;renderTPClock();updateTPSegments();updateTPLabel();});
      container.appendChild(btn);
    }
    const angle=(tpMinute/60)*360;
    hand.style.height=(r-12)+'px'; hand.style.top=(112-(r-12))+'px'; hand.style.left='111px';
    hand.style.transform=`rotate(${angle}deg)`;
  }
}

function getCoinBalance() { return getStorage('coins_balance', 0); }
function setCoinBalance(v) { setStorage('coins_balance', Math.max(0, v)); updateCoinDisplay(); }

function addCoins(amount, reason) {
  const newBal = getCoinBalance() + amount;
  setCoinBalance(newBal);
  const hist = getStorage('coins_history', []);
  hist.unshift({ amount, reason, timestamp: Date.now(), balance: newBal });
  setStorage('coins_history', hist.slice(0, 100));
}

function spendCoins(amount, reason) {
  const bal = getCoinBalance();
  if (bal < amount) return false;
  const newBal = bal - amount;
  setCoinBalance(newBal);
  const hist = getStorage('coins_history', []);
  hist.unshift({ amount: -amount, reason, timestamp: Date.now(), balance: newBal });
  setStorage('coins_history', hist.slice(0, 100));
  return true;
}

function updateCoinDisplay() {
  const bal = getCoinBalance();
  const el = document.getElementById('sidebar-coin-count');
  if (el) el.textContent = bal;
  const balEl = document.getElementById('coin-balance-display');
  if (balEl) balEl.textContent = bal + ' StudyCoins';
}

const SHOP_ITEMS = [
  { id: 'streak_freeze',  matIcon: 'ac_unit',            color: 'var(--md-primary)',   name: 'Streak Freeze',        desc: 'Protects your check-in streak for 1 missed day. Used automatically.', price: 50,  maxOwn: 5  },
  { id: 'double_coins',   matIcon: 'currency_exchange',  color: 'var(--md-primary)',   name: 'Double Coins (1 day)', desc: 'Earn 2× StudyCoins for all activities today.',                         price: 30,  maxOwn: 10 },
  { id: 'lucky_spin',     matIcon: 'casino',             color: 'var(--md-primary)',   name: 'Lucky Spin',           desc: 'Spin to win 5–100 bonus StudyCoins instantly.',                        price: 20,  maxOwn: 99 },
  { id: 'focus_boost',    matIcon: 'bolt',               color: 'var(--md-primary)',   name: 'Focus Boost',          desc: 'Unlock a 45-minute Pomodoro preset for power study sessions.',         price: 40,  maxOwn: 99 },
  { id: 'theme_unlock',   matIcon: 'workspace_premium',  color: 'var(--md-primary)',   name: 'Golden Theme Badge',   desc: 'A shiny golden badge on your dashboard to show off your dedication.',  price: 100, maxOwn: 1  }
];

function initShop() {
  updateCoinDisplay();
  renderShop();
}

function renderShop() {
  updateCoinDisplay();
  const shopGrid = document.getElementById('shop-grid');
  const inventoryList = document.getElementById('inventory-list');
  const historyList = document.getElementById('coin-history-list');

  const inventory = getStorage('inventory', {});
  if (shopGrid) {
    shopGrid.innerHTML = SHOP_ITEMS.map(item => {
      const owned = inventory[item.id] || 0;
      const maxed = owned >= item.maxOwn;
      return `<div class="shop-item${maxed ? ' maxed' : ''}">
        <div class="shop-item-icon" style="color:${sanitize(item.color)}">
          <span class="material-icons-round" aria-hidden="true">${sanitize(item.matIcon)}</span>
        </div>
        <div class="shop-item-info">
          <div class="shop-item-name">${sanitize(item.name)}</div>
          <div class="shop-item-desc">${sanitize(item.desc)}</div>
          ${owned > 0 ? `<div class="shop-item-owned"><span class="material-icons-round" aria-hidden="true" style="font-size:0.9rem;vertical-align:middle">inventory_2</span> Owned: ${owned}${item.maxOwn > 1 && item.maxOwn < 99 ? '/' + item.maxOwn : ''}</div>` : ''}
        </div>
        <button class="btn-filled shop-buy-btn" data-id="${sanitize(item.id)}" ${maxed ? 'disabled' : ''} aria-label="Buy ${sanitize(item.name)} for ${item.price} coins">
          <span class="material-icons-round" aria-hidden="true" style="font-size:1rem">toll</span>${item.price}
        </button>
      </div>`;
    }).join('');
    shopGrid.querySelectorAll('.shop-buy-btn').forEach(btn => {
      btn.addEventListener('click', () => buyShopItem(btn.dataset.id));
    });
  }

  if (inventoryList) {
    const ownedItems = SHOP_ITEMS.filter(i => (inventory[i.id] || 0) > 0);
    if (!ownedItems.length) {
      inventoryList.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:0.875rem;">Your inventory is empty. Visit the shop above!</p>';
    } else {
      inventoryList.innerHTML = ownedItems.map(i => `
        <div class="inventory-item">
          <span class="inventory-icon" style="color:${sanitize(i.color)}">
            <span class="material-icons-round" aria-hidden="true">${sanitize(i.matIcon)}</span>
          </span>
          <div class="inventory-info">
            <div class="inventory-name">${sanitize(i.name)}</div>
            <div class="inventory-qty">Qty: ${inventory[i.id]}</div>
          </div>
          ${i.id === 'streak_freeze' ? `<button class="btn-outlined" style="height:32px;padding:0 0.75rem;font-size:0.8rem;" data-use="${sanitize(i.id)}"><span class="material-icons-round" aria-hidden="true" style="font-size:1rem">ac_unit</span> Use</button>` : ''}
          ${i.id === 'lucky_spin' ? `<button class="btn-outlined" style="height:32px;padding:0 0.75rem;font-size:0.8rem;" data-use="${sanitize(i.id)}"><span class="material-icons-round" aria-hidden="true" style="font-size:1rem">casino</span> Spin!</button>` : ''}
        </div>`).join('');
      inventoryList.querySelectorAll('[data-use]').forEach(btn => {
        btn.addEventListener('click', () => useInventoryItem(btn.dataset.use));
      });
    }
  }

  if (historyList) {
    const hist = getStorage('coins_history', []).slice(0, 20);
    if (!hist.length) {
      historyList.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:0.875rem;">No coin history yet. Earn coins by checking in, journaling, and completing habits!</p>';
    } else {
      historyList.innerHTML = hist.map(h => `
        <div class="coin-history-item">
          <div class="coin-history-amount${h.amount < 0 ? ' negative' : ''}">
            <span class="material-icons-round" aria-hidden="true" style="font-size:1rem;vertical-align:middle">${h.amount < 0 ? 'remove_circle' : 'add_circle'}</span>
            ${h.amount > 0 ? '+' : ''}${h.amount}
          </div>
          <div class="coin-history-info">
            <div class="coin-history-reason">${sanitize(h.reason)}</div>
            <div class="coin-history-time">${new Date(h.timestamp).toLocaleString()}</div>
          </div>
          <div class="coin-history-total">
            <span class="material-icons-round" aria-hidden="true" style="font-size:0.9rem;vertical-align:middle;color:var(--md-on-surface-variant)">toll</span> ${h.balance}
          </div>
        </div>`).join('');
    }
  }
}

function buyShopItem(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return;
  const inventory = getStorage('inventory', {});
  const owned = inventory[itemId] || 0;
  if (owned >= item.maxOwn) { showToast('You already own the maximum!', 'error'); return; }
  if (getCoinBalance() < item.price) { showToast('Not enough StudyCoins! Keep checking in to earn more.', 'error'); return; }
  if (!confirm(`Buy "${item.name}" for ${item.price} StudyCoins?`)) return;

  if (itemId === 'lucky_spin') {
    const ok = spendCoins(item.price, `Bought: ${item.name}`);
    if (!ok) { showToast('Not enough StudyCoins!', 'error'); return; }
    const prize = [5, 10, 15, 20, 30, 50, 75, 100][Math.floor(Math.random() * 8)];
    addCoins(prize, `Lucky Spin prize`);
    showToast(`Lucky Spin — you won ${prize} StudyCoins!`, 'success');
    renderShop();
    return;
  }

  const ok = spendCoins(item.price, `Bought: ${item.name}`);
  if (!ok) { showToast('Not enough StudyCoins!', 'error'); return; }
  inventory[itemId] = owned + 1;
  setStorage('inventory', inventory);
  showToast(`"${item.name}" added to your inventory!`, 'success');
  renderShop();
}

function useInventoryItem(itemId) {
  const inventory = getStorage('inventory', {});
  if ((inventory[itemId] || 0) <= 0) { showToast('You don\'t have this item!', 'error'); return; }
  if (itemId === 'streak_freeze') {
    inventory[itemId]--;
    setStorage('inventory', inventory);
    const freezes = getStorage('streak_freezes', []);
    freezes.push(todayStr());
    setStorage('streak_freezes', [...new Set(freezes)]);
    showToast('Streak Freeze activated for today! Your streak is protected.', 'success');
    renderShop();
  } else if (itemId === 'lucky_spin') {
    inventory[itemId]--;
    setStorage('inventory', inventory);
    const prize = [5, 10, 15, 20, 30, 50, 75, 100][Math.floor(Math.random() * 8)];
    addCoins(prize, 'Lucky Spin prize');
    showToast(`Lucky Spin — you won ${prize} StudyCoins!`, 'success');
    renderShop();
  }
}

function calcCheckinStreakWithFreezes(checkins) {
  if (!checkins.length) return { current: 0, longest: 0 };
  const checkDates = new Set(checkins.map(c => c.date));
  const freezes = new Set(getStorage('streak_freezes', []));
  let longest = 0, cur = 0;
  let d = new Date(todayStr() + 'T12:00:00');
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().slice(0, 10);
    if (checkDates.has(ds) || freezes.has(ds)) {
      cur++;
      if (cur > longest) longest = cur;
    } else if (i === 0) {
      // today not checked, but continue (allow checking today)
      d.setDate(d.getDate() - 1);
      continue;
    } else {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  // Also compute overall longest streak across all history
  const allDates = [...checkDates].sort();
  let run = 0, maxRun = 0;
  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) { run = 1; } else {
      const prev = new Date(allDates[i-1] + 'T12:00:00');
      prev.setDate(prev.getDate() + 1);
      if (prev.toISOString().slice(0,10) === allDates[i] || freezes.has(allDates[i-1])) run++;
      else run = 1;
    }
    if (run > maxRun) maxRun = run;
  }
  return { current: cur, longest: Math.max(longest, maxRun) };
}

let streakCalMonth = new Date().getMonth();
let streakCalYear = new Date().getFullYear();

function initStreakCalendar() {
  const btn = document.getElementById('streak-cal-btn');
  btn && btn.addEventListener('click', openStreakCalendar);

  const closeBtn = document.getElementById('streak-cal-close');
  closeBtn && closeBtn.addEventListener('click', closeStreakCalendar);

  const scrim = document.getElementById('streak-cal-scrim');
  scrim && scrim.addEventListener('click', closeStreakCalendar);

  const prevBtn = document.getElementById('streak-cal-prev');
  prevBtn && prevBtn.addEventListener('click', () => {
    streakCalMonth--;
    if (streakCalMonth < 0) { streakCalMonth = 11; streakCalYear--; }
    renderStreakCalendar();
  });

  const nextBtn = document.getElementById('streak-cal-next');
  nextBtn && nextBtn.addEventListener('click', () => {
    streakCalMonth++;
    if (streakCalMonth > 11) { streakCalMonth = 0; streakCalYear++; }
    renderStreakCalendar();
  });
}

function openStreakCalendar() {
  streakCalMonth = new Date().getMonth();
  streakCalYear = new Date().getFullYear();
  const dialog = document.getElementById('streak-calendar-dialog');
  if (dialog) dialog.setAttribute('aria-hidden', 'false');
  renderStreakCalendar();
}

function closeStreakCalendar() {
  const dialog = document.getElementById('streak-calendar-dialog');
  if (dialog) dialog.setAttribute('aria-hidden', 'true');
}

function renderStreakCalendar() {
  const checkins = getStorage('checkins', []);
  const { current, longest } = calcCheckinStreakWithFreezes(checkins);
  const freezes = new Set(getStorage('streak_freezes', []));
  const checkDates = new Set(checkins.map(c => c.date));

  const curEl = document.getElementById('streak-cal-current');
  if (curEl) curEl.textContent = current;
  const longestEl = document.getElementById('streak-cal-longest');
  if (longestEl) longestEl.textContent = longest;

  const monthLabel = document.getElementById('streak-cal-month-label');
  const monthName = new Date(streakCalYear, streakCalMonth, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  if (monthLabel) monthLabel.textContent = monthName;

  const daysEl = document.getElementById('streak-cal-days');
  if (!daysEl) return;

  const today = todayStr();
  const firstDay = new Date(streakCalYear, streakCalMonth, 1).getDay();
  const daysInMonth = new Date(streakCalYear, streakCalMonth + 1, 0).getDate();

  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div class="streak-cal-day"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${streakCalYear}-${String(streakCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = ds === today;
    const isChecked = checkDates.has(ds);
    const isFrozen = freezes.has(ds);
    const isFuture = ds > today;
    let cls = 'streak-cal-day';
    if (isChecked) cls += ' checked';
    if (isFrozen && !isChecked) cls += ' frozen';
    if (isToday) cls += ' today';
    if (isFuture) cls += ' future';
    const title = isChecked ? 'Checked in' : isFrozen ? 'Streak Freeze used' : '';
    html += `<div class="${cls}" title="${title}">${d}${isFrozen && !isChecked ? '<span class="material-icons-round" style="font-size:0.65rem;vertical-align:middle;margin-left:1px">ac_unit</span>' : ''}</div>`;
  }
  daysEl.innerHTML = html;
}

let countdownTimer = null, countdownRunning = false, countdownRemaining = 0;

function initCountdown() {
  const startBtn = document.getElementById('start-countdown');
  const pauseBtn = document.getElementById('pause-countdown');
  const resetBtn = document.getElementById('reset-countdown');

  function getCountdownInput() {
    const h = sanitizeNum(document.getElementById('countdown-h') ? document.getElementById('countdown-h').value : 0, 0, 23);
    const m = sanitizeNum(document.getElementById('countdown-m') ? document.getElementById('countdown-m').value : 5, 0, 59);
    const s = sanitizeNum(document.getElementById('countdown-s') ? document.getElementById('countdown-s').value : 0, 0, 59);
    return h * 3600 + m * 60 + s;
  }

  function updateCountdownDisplay(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const el = document.getElementById('countdown-display');
    if (el) el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  startBtn && startBtn.addEventListener('click', () => {
    if (countdownRunning) return;
    if (countdownRemaining <= 0) countdownRemaining = getCountdownInput();
    if (countdownRemaining <= 0) { showToast('Set a countdown time first.', 'error'); return; }
    countdownRunning = true;
    countdownTimer = setInterval(() => {
      countdownRemaining--;
      updateCountdownDisplay(countdownRemaining);
      if (countdownRemaining <= 0) {
        clearInterval(countdownTimer); countdownRunning = false; countdownRemaining = 0;
        showToast('Countdown complete!', 'success');
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('StudyHub', { body: 'Your countdown timer has finished!', icon: '' });
        }
      }
    }, 1000);
  });

  pauseBtn && pauseBtn.addEventListener('click', () => {
    clearInterval(countdownTimer); countdownRunning = false;
  });

  resetBtn && resetBtn.addEventListener('click', () => {
    clearInterval(countdownTimer); countdownRunning = false;
    countdownRemaining = getCountdownInput();
    updateCountdownDisplay(countdownRemaining);
  });

  // Sync display on input change
  ['countdown-h','countdown-m','countdown-s'].forEach(id => {
    const el = document.getElementById(id);
    el && el.addEventListener('input', () => {
      if (!countdownRunning) {
        countdownRemaining = getCountdownInput();
        updateCountdownDisplay(countdownRemaining);
      }
    });
  });

  updateCountdownDisplay(getCountdownInput());
}

(function migrateJournalReminders() {
  try {
    const old = getStorage('journal_reminders', null);
    if (!old || !Array.isArray(old) || !old.length) return;
    const existing = getStorage('note_reminders', []);
    const existingKeys = new Set(existing.map(r => r.remTime + '_' + r.label));
    const migrated = old.map(r => ({
      reminderDate: r.reminderDate,
      remTime: r.remTime,
      label: 'Journal: ' + r.journalDate
    })).filter(r => !existingKeys.has(r.remTime + '_' + r.label));
    if (migrated.length) setStorage('note_reminders', existing.concat(migrated).slice(0, 50));
    localStorage.removeItem('journal_reminders');
  } catch {}
})();

function scheduleNoteReminder(reminderDate, label) {
  if (!reminderDate) return;
  const remTime = new Date(reminderDate + 'T09:00:00').getTime();
  const now = Date.now();
  if (remTime <= now) return;
  const reminders = getStorage('note_reminders', []);
  const entry = { reminderDate, remTime, label: (label || '').slice(0, 60) };
  const existing = reminders.findIndex(r => r.reminderDate === reminderDate && r.label === entry.label);
  if (existing >= 0) reminders[existing] = entry;
  else reminders.push(entry);
  setStorage('note_reminders', reminders.slice(0, 50));
  // Request notification permission
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Keep scheduleJournalReminder as an alias for backward-compatibility with any
// other call sites that may exist in the file, redirecting to note_reminders.
function scheduleJournalReminder(date, reminderDate) {
  scheduleNoteReminder(reminderDate, 'Journal: ' + date);
}

function checkReminders() {
  const reminders = getStorage('note_reminders', []);
  if (!reminders.length) return;
  const now = Date.now();
  let changed = false;
  const updated = reminders.filter(r => {
    if (r.remTime <= now + 60000 && r.remTime >= now - 3600000) {
      // Fire if within 1 minute window
      if (r.remTime <= now) {
        const msg = r.label ? `Reminder: ${r.label}` : `Reminder for ${r.reminderDate}`;
        showToast(msg, 'success');
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('StudyHub Reminder', { body: msg });
        }
        changed = true;
        return false; // remove fired reminder
      }
    }
    return r.remTime > now - 3600000;
  });
  if (changed) setStorage('note_reminders', updated);
}

setInterval(checkReminders, 60000);
checkReminders();

document.addEventListener('DOMContentLoaded', () => {
  initShop();
  initStreakCalendar();
  initCountdown();
  updateCoinDisplay();
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    // Don't auto-request; wait until user saves a reminder
  }
});

const StudyHub = {
  runTests() {
    let passed = 0, failed = 0;
    function assert(desc, condition) {
      if (condition) { console.log('%c✔ ' + desc, 'color:green'); passed++; }
      else { console.error('%c✗ ' + desc, 'color:red'); failed++; }
    }

    const LS_BACKUP = {};
    function lsSet(k, v) { LS_BACKUP[k] = localStorage.getItem(k); localStorage.setItem(k, JSON.stringify(v)); }
    function lsRestore() { Object.keys(LS_BACKUP).forEach(k => { if (LS_BACKUP[k] === null) localStorage.removeItem(k); else localStorage.setItem(k, LS_BACKUP[k]); }); }
    function resetState() { _notesState.query=''; _notesState.sort='date-desc'; _journalState.query=''; _journalState.sort='date-desc'; _todoState.query=''; _todoState.sort='date-desc'; }

    (function testMigration() {
      const future = new Date(Date.now() + 86400000 * 2);
      const rd = future.toISOString().slice(0, 10);
      const rt = new Date(rd + 'T09:00:00').getTime();
      lsSet('journal_reminders', [{ journalDate: '2099-01-01', reminderDate: rd, remTime: rt }]);
      lsSet('note_reminders', []);
      try {
        const old = getStorage('journal_reminders', null);
        if (old && Array.isArray(old) && old.length) {
          const existing = getStorage('note_reminders', []);
          const existingKeys = new Set(existing.map(r => r.remTime + '_' + r.label));
          const migrated = old.map(r => ({ reminderDate: r.reminderDate, remTime: r.remTime, label: 'Journal: ' + r.journalDate })).filter(r => !existingKeys.has(r.remTime + '_' + r.label));
          if (migrated.length) setStorage('note_reminders', existing.concat(migrated).slice(0, 50));
          localStorage.removeItem('journal_reminders');
        }
      } catch {}
      const result = getStorage('note_reminders', []);
      assert('Migration: journal_reminders → note_reminders', result.length === 1 && result[0].label === 'Journal: 2099-01-01');
      assert('Migration: journal_reminders key removed', localStorage.getItem('journal_reminders') === null);
      lsRestore();
    })();

    (function testScheduleNote() {
      lsSet('note_reminders', []);
      const future = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
      scheduleNoteReminder(future, 'Test note');
      const reminders = getStorage('note_reminders', []);
      assert('scheduleNoteReminder: stores to note_reminders', reminders.length === 1 && reminders[0].label === 'Test note');
      assert('scheduleNoteReminder: no journal_reminders written', !localStorage.getItem('journal_reminders'));
      scheduleNoteReminder('2000-01-01', 'Past note');
      assert('scheduleNoteReminder: ignores past dates', getStorage('note_reminders', []).length === 1);
      lsRestore();
    })();

    (function testJournalAlias() {
      lsSet('note_reminders', []);
      const future = new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10);
      scheduleJournalReminder('2099-03-01', future);
      const reminders = getStorage('note_reminders', []);
      assert('scheduleJournalReminder alias: stores to note_reminders', reminders.length === 1 && reminders[0].label.includes('Journal:'));
      lsRestore();
    })();

    (function testCheckReminders() {
      const pastTime = Date.now() - 30000;
      lsSet('note_reminders', [{ reminderDate: '2000-01-01', remTime: pastTime, label: 'Check test' }]);
      let toasted = false;
      const orig = window.showToast;
      window.showToast = (msg) => { if (msg.includes('Check test')) toasted = true; };
      checkReminders();
      window.showToast = orig;
      assert('checkReminders: fires toast', toasted);
      assert('checkReminders: removes fired reminder', getStorage('note_reminders', []).length === 0);
      lsRestore();
    })();

    (function testNoteSaveReminder() {
      lsSet('notes', []);
      const future = new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10);
      const fakeNote = { content: 'Hello reminder', date: todayStr(), timestamp: Date.now(), id: 1, labels: [], reminder: future };
      setStorage('notes', [fakeNote]);
      assert('Notes: reminder field persists on note object', getStorage('notes', [])[0].reminder === future);
      lsRestore();
    })();

    (function testNoteTagsOnEdit() {
      lsSet('notes', [{ content: 'Tag test', date: todayStr(), timestamp: Date.now(), id: 2, labels: ['study', 'math'] }]);
      const noteList = document.getElementById('notes-list');
      if (!noteList) { assert('Notes tag edit: notes-list in DOM', false); lsRestore(); return; }
      resetState(); renderNotesList();
      const editBtn = noteList.querySelector('.note-edit-btn');
      if (!editBtn) { assert('Notes tag edit: edit button rendered', false); lsRestore(); return; }
      editBtn.click();
      const labelInput = document.getElementById('note-label-input');
      assert('Notes tag edit: label input populated', labelInput && labelInput.value === 'study, math');
      lsRestore(); resetState();
    })();

    (function testJournalTagsOnEdit() {
      lsSet('journals', { '2099-06-01': 'Journal content here' });
      lsSet('journal_meta', { '2099-06-01': { labels: ['reflection', 'goals'] } });
      const jHistory = document.getElementById('journal-history');
      if (!jHistory) { assert('Journal tag edit: journal-history in DOM', false); lsRestore(); return; }
      resetState(); renderJournalHistory();
      const editBtn = jHistory.querySelector('.journal-action-btn.edit');
      if (!editBtn) { assert('Journal tag edit: edit button rendered', false); lsRestore(); return; }
      editBtn.click();
      const jLabelInput = document.getElementById('journal-label-input');
      assert('Journal tag edit: label input populated', jLabelInput && jLabelInput.value === 'reflection, goals');
      lsRestore(); resetState();
    })();

    (function testCancelHiddenByDefault() {
      const cn = document.getElementById('cancel-note-edit');
      const cj = document.getElementById('cancel-journal-edit');
      assert('Cancel Note: hidden by default', !cn || cn.style.display === 'none' || cn.offsetParent === null);
      assert('Cancel Journal: hidden by default', !cj || cj.style.display === 'none' || cj.offsetParent === null);
    })();

    (function testNoteReminderUI() {
      assert('Notes: reminder trigger exists', !!document.getElementById('note-reminder-date-trigger'));
      assert('Notes: reminder display exists', !!document.getElementById('note-reminder-display'));
      assert('Notes: reminder hidden input exists', !!document.getElementById('note-reminder-date'));
    })();

    (function testJournalReminderRemoved() {
      assert('Journal: old reminder trigger removed', !document.getElementById('journal-reminder-date-trigger'));
      assert('Journal: old reminder display removed', !document.getElementById('journal-reminder-display'));
      assert('Journal: old reminder hidden removed', !document.getElementById('journal-reminder-date'));
    })();

    (function testDebounce() {
      let calls = 0;
      const fn = debounce(() => calls++, 50);
      fn(); fn(); fn();
      assert('debounce: multiple rapid calls do not fire immediately', calls === 0);
    })();

    (function testMatchesQuery() {
      assert('matchesQuery: empty query matches all', matchesQuery('', ['anything']));
      assert('matchesQuery: case-insensitive hit', matchesQuery('HELLO', ['hello world']));
      assert('matchesQuery: matches any field', matchesQuery('math', ['algebra', 'math notes']));
      assert('matchesQuery: no match returns false', !matchesQuery('xyz', ['abc', 'def']));
      assert('matchesQuery: null/undefined fields ignored', matchesQuery('test', [null, undefined, 'test']));
    })();

    (function testStableSort() {
      const arr = [{ v: 1, k: 'b' }, { v: 1, k: 'a' }, { v: 2, k: 'c' }];
      const sorted = stableSort(arr, (a, b) => a.v - b.v);
      assert('stableSort: ascending by value', sorted[0].v === 1 && sorted[2].v === 2);
      assert('stableSort: equal elements preserve original order', sorted[0].k === 'b' && sorted[1].k === 'a');
      assert('stableSort: does not mutate original array', arr[0].k === 'b');
    })();

    (function testPriorityOrder() {
      assert('PRIORITY_ORDER: Urgent < High < Medium < Low', PRIORITY_ORDER.Urgent < PRIORITY_ORDER.High && PRIORITY_ORDER.High < PRIORITY_ORDER.Medium && PRIORITY_ORDER.Medium < PRIORITY_ORDER.Low);
    })();

    (function testNotesSearchContent() {
      lsSet('notes', [
        { content: 'Alpha note', date: todayStr(), timestamp: 1, id: 100, labels: [] },
        { content: 'Beta note',  date: todayStr(), timestamp: 2, id: 101, labels: [] }
      ]);
      const el = document.getElementById('notes-list');
      if (!el) { assert('Notes search content: notes-list in DOM', false); lsRestore(); return; }
      _notesState.query = 'alpha';
      renderNotesList();
      assert('Notes search: shows matching note', el.querySelectorAll('.note-item').length === 1);
      assert('Notes search: correct note shown', el.innerHTML.includes('Alpha note'));
      lsRestore(); resetState();
    })();

    (function testNotesSearchTag() {
      lsSet('notes', [
        { content: 'No tag note', date: todayStr(), timestamp: 1, id: 200, labels: [] },
        { content: 'Tagged note', date: todayStr(), timestamp: 2, id: 201, labels: ['physics'] }
      ]);
      const el = document.getElementById('notes-list');
      if (!el) { assert('Notes search tag: notes-list in DOM', false); lsRestore(); return; }
      _notesState.query = 'physics';
      renderNotesList();
      assert('Notes search: tag match returns 1 result', el.querySelectorAll('.note-item').length === 1);
      lsRestore(); resetState();
    })();

    (function testNotesSearchEmpty() {
      lsSet('notes', [
        { content: 'A', date: todayStr(), timestamp: 1, id: 300, labels: [] },
        { content: 'B', date: todayStr(), timestamp: 2, id: 301, labels: [] }
      ]);
      const el = document.getElementById('notes-list');
      if (!el) { assert('Notes search empty: notes-list in DOM', false); lsRestore(); return; }
      _notesState.query = '';
      renderNotesList();
      assert('Notes search: empty query shows all', el.querySelectorAll('.note-item').length === 2);
      lsRestore(); resetState();
    })();

    (function testNotesSortAlpha() {
      lsSet('notes', [
        { content: 'Zebra', date: todayStr(), timestamp: 1, id: 400, labels: [] },
        { content: 'Apple', date: todayStr(), timestamp: 2, id: 401, labels: [] }
      ]);
      const el = document.getElementById('notes-list');
      if (!el) { assert('Notes sort alpha: notes-list in DOM', false); lsRestore(); return; }
      _notesState.query = ''; _notesState.sort = 'alpha-asc';
      renderNotesList();
      const items = el.querySelectorAll('.note-item-content');
      assert('Notes sort alpha-asc: Apple before Zebra', items[0].textContent.includes('Apple'));
      lsRestore(); resetState();
    })();

    (function testNotesSortDateDesc() {
      lsSet('notes', [
        { content: 'Older', date: todayStr(), timestamp: 1000, id: 500, labels: [] },
        { content: 'Newer', date: todayStr(), timestamp: 9000, id: 501, labels: [] }
      ]);
      const el = document.getElementById('notes-list');
      if (!el) { assert('Notes sort date-desc: notes-list in DOM', false); lsRestore(); return; }
      _notesState.query = ''; _notesState.sort = 'date-desc';
      renderNotesList();
      const items = el.querySelectorAll('.note-item-content');
      assert('Notes sort date-desc: Newer first', items[0].textContent.includes('Newer'));
      lsRestore(); resetState();
    })();

    (function testJournalSearch() {
      lsSet('journals', { '2099-01-01': 'Alpha entry', '2099-02-01': 'Beta entry' });
      lsSet('journal_meta', {});
      const el = document.getElementById('journal-history');
      if (!el) { assert('Journal search: journal-history in DOM', false); lsRestore(); return; }
      _journalState.query = 'beta';
      renderJournalHistory();
      assert('Journal search: shows only matching entry', el.querySelectorAll('.journal-item').length === 1);
      assert('Journal search: correct entry shown', el.innerHTML.includes('Beta entry'));
      lsRestore(); resetState();
    })();

    (function testJournalSearchLabel() {
      lsSet('journals', { '2099-03-01': 'Some content', '2099-04-01': 'Other content' });
      lsSet('journal_meta', { '2099-03-01': { labels: ['mindfulness'] }, '2099-04-01': { labels: [] } });
      const el = document.getElementById('journal-history');
      if (!el) { assert('Journal search label: journal-history in DOM', false); lsRestore(); return; }
      _journalState.query = 'mindfulness';
      renderJournalHistory();
      assert('Journal search: label match shows 1 result', el.querySelectorAll('.journal-item').length === 1);
      lsRestore(); resetState();
    })();

    (function testJournalSortDateAsc() {
      lsSet('journals', { '2099-06-01': 'June', '2099-01-01': 'January' });
      lsSet('journal_meta', {});
      const el = document.getElementById('journal-history');
      if (!el) { assert('Journal sort: journal-history in DOM', false); lsRestore(); return; }
      _journalState.query = ''; _journalState.sort = 'date-asc';
      renderJournalHistory();
      const items = el.querySelectorAll('.journal-item-preview');
      assert('Journal sort date-asc: January before June', items[0].textContent.includes('January'));
      lsRestore(); resetState();
    })();

    (function testTodoSearch() {
      lsSet('todos', [
        { text: 'Buy milk', priority: 'Low', progress: 'Not Started', addedAt: Date.now(), id: 600 },
        { text: 'Write report', priority: 'High', progress: 'Not Started', addedAt: Date.now(), id: 601 }
      ]);
      const el = document.getElementById('todo-list');
      if (!el) { assert('Todo search: todo-list in DOM', false); lsRestore(); return; }
      _todoState.query = 'report';
      renderTodos();
      assert('Todo search: shows only matching task', el.querySelectorAll('.todo-item').length === 1);
      assert('Todo search: correct task shown', el.innerHTML.includes('Write report'));
      lsRestore(); resetState();
    })();

    (function testTodoSortPriority() {
      lsSet('todos', [
        { text: 'Low task', priority: 'Low', progress: 'Not Started', addedAt: 1, id: 700 },
        { text: 'Urgent task', priority: 'Urgent', progress: 'Not Started', addedAt: 2, id: 701 }
      ]);
      const el = document.getElementById('todo-list');
      if (!el) { assert('Todo priority sort: todo-list in DOM', false); lsRestore(); return; }
      _todoState.query = ''; _todoState.sort = 'priority-asc';
      renderTodos();
      const items = el.querySelectorAll('.todo-item div:first-child');
      assert('Todo sort priority-asc: Urgent first', items[0] && items[0].textContent.includes('Urgent'));
      lsRestore(); resetState();
    })();

    (function testTodoSortDeadline() {
      lsSet('todos', [
        { text: 'Far deadline', priority: 'Low', progress: 'Not Started', addedAt: 1, id: 800, deadline: '2099-12-31T23:59:59' },
        { text: 'Near deadline', priority: 'Low', progress: 'Not Started', addedAt: 2, id: 801, deadline: '2099-01-01T23:59:59' }
      ]);
      const el = document.getElementById('todo-list');
      if (!el) { assert('Todo deadline sort: todo-list in DOM', false); lsRestore(); return; }
      _todoState.query = ''; _todoState.sort = 'deadline-asc';
      renderTodos();
      const items = el.querySelectorAll('.todo-item');
      assert('Todo sort deadline-asc: Near deadline first', items[0] && items[0].textContent.includes('Near deadline'));
      lsRestore(); resetState();
    })();

    (function testTodoDeleteById() {
      lsSet('todos', [
        { text: 'Keep me', priority: 'Low', progress: 'Not Started', addedAt: 1, id: 'keep-1' },
        { text: 'Delete me', priority: 'High', progress: 'Not Started', addedAt: 2, id: 'del-1' }
      ]);
      const el = document.getElementById('todo-list');
      if (!el) { assert('Todo delete by id: todo-list in DOM', false); lsRestore(); return; }
      _todoState.query = ''; _todoState.sort = 'priority-asc'; // High first → del-1 is item[0]
      renderTodos();
      const delBtn = el.querySelector('.todo-delete');
      if (!delBtn) { assert('Todo delete by id: delete button rendered', false); lsRestore(); return; }
      delBtn.click();
      const remaining = getStorage('todos', []);
      assert('Todo delete by id: correct item removed', remaining.length === 1 && remaining[0].id === 'keep-1');
      lsRestore(); resetState();
    })();

    (function testSearchUIExists() {
      assert('DOM: notes-search input', !!document.getElementById('notes-search'));
      assert('DOM: notes-sort select', !!document.getElementById('notes-sort'));
      assert('DOM: journal-search input', !!document.getElementById('journal-search'));
      assert('DOM: journal-sort select', !!document.getElementById('journal-sort'));
      assert('DOM: todo-search input', !!document.getElementById('todo-search'));
      assert('DOM: todo-sort select', !!document.getElementById('todo-sort'));
    })();

    (function testNoResultsMessage() {
      lsSet('notes', [{ content: 'Only note', date: todayStr(), timestamp: 1, id: 900, labels: [] }]);
      const el = document.getElementById('notes-list');
      if (!el) { assert('No-results: notes-list in DOM', false); lsRestore(); return; }
      _notesState.query = 'zzzzzznomatch';
      renderNotesList();
      assert('No-results: message shown when search has no match', el.querySelector('.search-no-results') !== null);
      lsRestore(); resetState();
    })();

    (function testSidebarCoinIcon() {
      const coinEl = document.getElementById('sidebar-coins');
      if (!coinEl) { assert('Sidebar coins: element exists', false); return; }
      const icon = coinEl.querySelector('.material-icons-round.sidebar-coin-icon');
      assert('Sidebar coin: uses material-icons-round.sidebar-coin-icon', !!icon);
      assert('Sidebar coin: icon text is "toll"', icon && icon.textContent.trim() === 'toll');
      assert('Sidebar coin: no 🪙 emoji present', !coinEl.innerHTML.includes('🪙'));
    })();

    (function testJournalLabelIcon() {
      lsSet('journals', { '2099-07-01': 'Test entry' });
      lsSet('journal_meta', { '2099-07-01': { labels: ['test-label'] } });
      const el = document.getElementById('journal-history');
      if (!el) { assert('Journal label icon: journal-history in DOM', false); lsRestore(); return; }
      resetState(); renderJournalHistory();
      assert('Journal label: no 🏷 emoji in rendered HTML', !el.innerHTML.includes('🏷'));
      assert('Journal label: uses material-icons-round', el.querySelector('.item-label .material-icons-round') !== null);
      lsRestore(); resetState();
    })();

    (function testOnboardingDOM() {
      assert('Onboarding: overlay element exists', !!document.getElementById('onboarding-overlay'));
      assert('Onboarding: SVG mask exists', !!document.getElementById('onboarding-mask'));
      assert('Onboarding: spotlight-hole rect exists', !!document.getElementById('spotlight-hole'));
      assert('Onboarding: tooltip element exists', !!document.getElementById('onboarding-tooltip'));
      assert('Onboarding: next button exists', !!document.getElementById('onboarding-next'));
      assert('Onboarding: skip button exists', !!document.getElementById('onboarding-skip'));
      assert('Onboarding: dots container exists', !!document.getElementById('onboarding-dots'));
      assert('Onboarding: legacy .onboarding-card removed', !document.querySelector('.onboarding-card'));
      assert('Onboarding: legacy .onboarding-scrim removed', !document.querySelector('.onboarding-scrim'));
    })();

    (function testOnboardingSteps() {
      assert('ONBOARDING_STEPS: array defined', Array.isArray(ONBOARDING_STEPS));
      assert('ONBOARDING_STEPS: at least 4 steps', ONBOARDING_STEPS.length >= 4);
      ONBOARDING_STEPS.forEach((s, i) => {
        assert(`Step ${i}: has icon`, typeof s.icon === 'string' && s.icon.length > 0);
        assert(`Step ${i}: has title`, typeof s.title === 'string' && s.title.length > 0);
        assert(`Step ${i}: has body`, typeof s.body === 'string' && s.body.length > 0);
      });
      const navSteps = ONBOARDING_STEPS.filter(s => s.targetSelector && s.targetSelector.includes('#sidebar'));
      assert('Onboarding: nav steps highlight entire sidebar/bottom-nav', navSteps.length >= 2);
      const individualNavTargets = ONBOARDING_STEPS.filter(s =>
        s.targetSelector && (s.targetSelector.includes('.nav-item') || s.targetSelector.includes('.bnav-item'))
      );
      assert('Onboarding: no step targets individual nav items', individualNavTargets.length === 0);
    })();

    (function testObClamp() {
      assert('_obClamp: clamps to min', _obClamp(-5, 0, 100) === 0);
      assert('_obClamp: clamps to max', _obClamp(200, 0, 100) === 100);
      assert('_obClamp: passes through mid', _obClamp(50, 0, 100) === 50);
    })();

    (function testObTarget() {
      assert('_obTarget: returns null for null selector', _obTarget(null) === null);
      assert('_obTarget: finds body element', _obTarget('body') === document.body);
      assert('_obTarget: comma-separated falls back', _obTarget('.nonexistent-xyz, body') === document.body);
      assert('_obTarget: returns null if no match', _obTarget('.absolutely-nonexistent-xyz') === null);
    })();

    (function testOnboardingRestart() {
      assert('initOnboarding.restart: function exposed', typeof initOnboarding.restart === 'function');
    })();

    (function testRestartResetsFlag() {
      lsSet('onboarding_done', true);
      setStorage('onboarding_done', false);
      assert('Restart: onboarding_done reset to false', getStorage('onboarding_done', true) === false);
      lsRestore();
    })();

    (function testMobileGreetingDOM() {
      assert('Mobile greeting: container exists', !!document.getElementById('mobile-home-greeting'));
      assert('Mobile greeting: time span exists', !!document.getElementById('mobile-greeting-time'));
      assert('Mobile greeting: name span exists', !!document.getElementById('mobile-greeting-name'));
      assert('Mobile greeting: no "StudyHub" title beside hamburger', !document.querySelector('.mobile-page-header--home .mobile-page-title'));
    })();

    (function testMobileGreetingUpdate() {
      lsSet('profile_name', 'Alice');
      updateHomeDashboard();
      const nameEl = document.getElementById('mobile-greeting-name');
      const timeEl = document.getElementById('mobile-greeting-time');
      assert('Mobile greeting: name updated by updateHomeDashboard', nameEl && nameEl.textContent === 'Alice');
      assert('Mobile greeting: time updated by updateHomeDashboard', timeEl && timeEl.textContent.length > 0);
      lsRestore();
    })();

    (function testRestartButtonInSettings() {
      assert('Settings: restart-onboarding button exists', !!document.getElementById('restart-onboarding'));
    })();

    (function testSpotlightNoTarget() {
      const hole = document.getElementById('spotlight-hole');
      if (!hole) { assert('Spotlight: hole element exists', false); return; }
      _obUpdateSpotlight(null, 0);
      assert('Spotlight: no-target sets width=0', hole.getAttribute('width') === '0');
      assert('Spotlight: no-target sets height=0', hole.getAttribute('height') === '0');
    })();

    (function testThemeButtonA11y() {
      const btns = document.querySelectorAll('.theme-opt-btn');
      assert('Theme buttons: at least 3 exist', btns.length >= 3);
      btns.forEach(b => {
        assert(`Theme btn "${b.dataset.theme}": has aria-pressed`, b.hasAttribute('aria-pressed'));
        assert(`Theme btn "${b.dataset.theme}": has data-theme`, !!b.dataset.theme);
      });
    })();

    (function testMobileBottomNav() {
      const nav = document.getElementById('bottom-nav');
      assert('Mobile bottom-nav: element exists', !!nav);
      assert('Mobile bottom-nav: has bnav-item buttons', nav && nav.querySelectorAll('.bnav-item').length >= 4);
      assert('Mobile bottom-nav: has role=navigation', nav && nav.getAttribute('role') === 'navigation');
    })();

    (function testObTargetFixed() {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        const origDisplay = sidebar.style.display;
        sidebar.style.display = 'flex';
        const found = _obTarget('#sidebar');
        assert('_obTarget: handles #sidebar selector without throwing', true);
        sidebar.style.display = origDisplay;
      }
      assert('_obTarget: null selector returns null', _obTarget(null) === null);
      assert('_obTarget: empty selector returns null', _obTarget('.no-such-element-xyz') === null);
    })();

    (function testSpotlightViewportClamp() {
      const hole = document.getElementById('spotlight-hole');
      if (!hole) { assert('Spotlight: hole element exists for clamp test', false); return; }
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;left:-50px;top:-50px;width:100px;height:100px;';
      document.body.appendChild(el);
      _obUpdateSpotlight(el, 10);
      const x = parseFloat(hole.getAttribute('x'));
      const y = parseFloat(hole.getAttribute('y'));
      assert('Spotlight: x clamped to >= 0', x >= 0);
      assert('Spotlight: y clamped to >= 0', y >= 0);
      document.body.removeChild(el);
      hole.setAttribute('width', '0');
      hole.setAttribute('height', '0');
    })();

    (function testRestartAlwaysExposed() {
      assert('initOnboarding.restart: always a function', typeof initOnboarding.restart === 'function');
    })();

    (function testMobileHomeHeader() {
      const header = document.querySelector('.mobile-page-header--home');
      assert('Mobile home: header exists', !!header);
      const hamburger = header && header.querySelector('#hamburger-btn');
      assert('Mobile home: hamburger is inside header', !!hamburger);
      const greeting = header && header.querySelector('#mobile-home-greeting');
      assert('Mobile home: greeting is inside header', !!greeting);
      // hamburger should appear before greeting in DOM (left side)
      if (header && hamburger && greeting) {
        const children = Array.from(header.children);
        const hIdx = children.indexOf(hamburger);
        const gIdx = children.indexOf(greeting);
        assert('Mobile home: hamburger comes before greeting in DOM', hIdx < gIdx);
      }
    })();

    (function testTpParseInput24h() {
      let r;
      r = tpParseInput('23:00');
      assert('tpParseInput: 23:00 → hour=11', r && r.hour === 11);
      assert('tpParseInput: 23:00 → minute=0', r && r.minute === 0);
      assert('tpParseInput: 23:00 → period=PM', r && r.period === 'PM');

      r = tpParseInput('13:30');
      assert('tpParseInput: 13:30 → hour=1', r && r.hour === 1);
      assert('tpParseInput: 13:30 → minute=30', r && r.minute === 30);
      assert('tpParseInput: 13:30 → period=PM', r && r.period === 'PM');

      r = tpParseInput('00:15');
      assert('tpParseInput: 00:15 → hour=12', r && r.hour === 12);
      assert('tpParseInput: 00:15 → minute=15', r && r.minute === 15);
      assert('tpParseInput: 00:15 → period=AM', r && r.period === 'AM');

      r = tpParseInput('12:00');
      assert('tpParseInput: 12:00 → hour=12', r && r.hour === 12);
      assert('tpParseInput: 12:00 → period=PM', r && r.period === 'PM');

      r = tpParseInput('00:00');
      assert('tpParseInput: 00:00 → hour=12', r && r.hour === 12);
      assert('tpParseInput: 00:00 → period=AM', r && r.period === 'AM');
    })();

    (function testTpParseInput12h() {
      let r;
      r = tpParseInput('11:30 PM');
      assert('tpParseInput: 11:30 PM → hour=11', r && r.hour === 11);
      assert('tpParseInput: 11:30 PM → minute=30', r && r.minute === 30);
      assert('tpParseInput: 11:30 PM → period=PM', r && r.period === 'PM');

      r = tpParseInput('12am');
      assert('tpParseInput: 12am → hour=12', r && r.hour === 12);
      assert('tpParseInput: 12am → period=AM', r && r.period === 'AM');

      r = tpParseInput('12pm');
      assert('tpParseInput: 12pm → hour=12', r && r.hour === 12);
      assert('tpParseInput: 12pm → period=PM', r && r.period === 'PM');

      r = tpParseInput('3:15pm');
      assert('tpParseInput: 3:15pm → hour=3', r && r.hour === 3);
      assert('tpParseInput: 3:15pm → minute=15', r && r.minute === 15);
      assert('tpParseInput: 3:15pm → period=PM', r && r.period === 'PM');
    })();

    (function testTpParseInputCompact() {
      let r;
      r = tpParseInput('930');
      assert('tpParseInput: "930" → hour=9', r && r.hour === 9);
      assert('tpParseInput: "930" → minute=30', r && r.minute === 30);

      r = tpParseInput('1330');
      assert('tpParseInput: "1330" → hour=1', r && r.hour === 1);
      assert('tpParseInput: "1330" → period=PM', r && r.period === 'PM');

      r = tpParseInput('9');
      assert('tpParseInput: "9" → hour=9, minute=0', r && r.hour === 9 && r.minute === 0);
    })();

    (function testTpParseInputInvalid() {
      assert('tpParseInput: null → null', tpParseInput(null) === null);
      assert('tpParseInput: "" → null', tpParseInput('') === null);
      assert('tpParseInput: "abc" → null', tpParseInput('abc') === null);
      assert('tpParseInput: "99:00" → null', tpParseInput('99:00') === null);
      assert('tpParseInput: "12:99" → null', tpParseInput('12:99') === null);
    })();

    (function testTpSmartPeriod() {
      const r1 = tpSmartPeriod(9, 0);
      assert('tpSmartPeriod: returns AM or PM for 9:00', r1 === 'AM' || r1 === 'PM');

      const r2 = tpSmartPeriod(12, 0);
      assert('tpSmartPeriod: returns AM or PM for 12:00', r2 === 'AM' || r2 === 'PM');

      const r3 = tpSmartPeriod(1, 0);
      assert('tpSmartPeriod: returns AM or PM for 1:00', r3 === 'AM' || r3 === 'PM');
    })();

    (function testTpTo24() {
      assert('tpTo24: 12:00 AM → 00:00', tpTo24(12, 0, 'AM') === '00:00');
      assert('tpTo24: 12:00 PM → 12:00', tpTo24(12, 0, 'PM') === '12:00');
      assert('tpTo24: 1:30 PM → 13:30',  tpTo24(1, 30, 'PM') === '13:30');
      assert('tpTo24: 11:59 PM → 23:59', tpTo24(11, 59, 'PM') === '23:59');
      assert('tpTo24: 1:00 AM → 01:00',  tpTo24(1, 0, 'AM') === '01:00');
      assert('tpTo24: 12:30 AM → 00:30', tpTo24(12, 30, 'AM') === '00:30');
    })();

    (function testTimepickerDOM() {
      assert('TP: dialog exists', !!document.getElementById('time-picker-dialog'));
      assert('TP: hour button exists', !!document.getElementById('tp-hour-btn'));
      assert('TP: minute button exists', !!document.getElementById('tp-min-btn'));
      assert('TP: AM button exists', !!document.getElementById('tp-am'));
      assert('TP: PM button exists', !!document.getElementById('tp-pm'));
      assert('TP: OK button exists', !!document.getElementById('tp-ok'));
      assert('TP: Cancel button exists', !!document.getElementById('tp-cancel'));
      assert('TP: hint element exists', !!document.getElementById('tp-input-hint'));
    })();

    (function testTPOpenClose() {
      const dialog = document.getElementById('time-picker-dialog');
      openTimePicker('14:30', () => {});
      assert('TP: dialog visible after open', dialog && dialog.getAttribute('aria-hidden') === 'false');
      assert('TP: tpHour=2 after 14:30', tpHour === 2);
      assert('TP: tpMinute=30 after 14:30', tpMinute === 30);
      assert('TP: tpPeriod=PM after 14:30', tpPeriod === 'PM');
      closeTimePicker();
      assert('TP: dialog hidden after close', dialog && dialog.getAttribute('aria-hidden') === 'true');
      assert('TP: callback cleared after close', tpCallback === null);

      openTimePicker('00:00', () => {});
      assert('TP: tpHour=12 for 00:00', tpHour === 12);
      assert('TP: tpPeriod=AM for 00:00', tpPeriod === 'AM');
      closeTimePicker();

      openTimePicker('12:00', () => {});
      assert('TP: tpHour=12 for 12:00', tpHour === 12);
      assert('TP: tpPeriod=PM for 12:00', tpPeriod === 'PM');
      closeTimePicker();
    })();

    (function testTPPeriodToggle() {
      openTimePicker('09:00', () => {});
      assert('TP: initial period AM for 09:00', tpPeriod === 'AM');
      tpPeriod = 'PM';
      updateTPPeriod();
      updateTPLabel();
      const label = document.getElementById('tp-selected-label');
      assert('TP: label shows PM after toggle', label && label.textContent.includes('PM'));
      const pmBtn = document.getElementById('tp-pm');
      assert('TP: pm button active after toggle', pmBtn && pmBtn.classList.contains('active'));
      const amBtn = document.getElementById('tp-am');
      assert('TP: am button inactive after toggle', amBtn && !amBtn.classList.contains('active'));
      closeTimePicker();
    })();

    (function testTPOKOutput() {
      let result = null;
      openTimePicker('', t => { result = t; });
      tpHour = 11; tpMinute = 45; tpPeriod = 'PM';
      updateTPSegments(); updateTPLabel();
      const timeStr = tpTo24(tpHour, tpMinute, tpPeriod);
      assert('TP: 11:45 PM → 23:45', timeStr === '23:45');

      tpHour = 12; tpMinute = 15; tpPeriod = 'AM';
      assert('TP: 12:15 AM → 00:15', tpTo24(tpHour, tpMinute, tpPeriod) === '00:15');

      tpHour = 12; tpMinute = 0; tpPeriod = 'PM';
      assert('TP: 12:00 PM → 12:00', tpTo24(tpHour, tpMinute, tpPeriod) === '12:00');
      closeTimePicker();
    })();

    (function testBnavStudy() {
      const bnav = document.getElementById('bottom-nav');
      assert('Bnav: element exists', !!bnav);
      const studyBtn = bnav && bnav.querySelector('[data-page="study"].bnav-item');
      assert('Bnav: Study item present', !!studyBtn);
      const insightsBtn = bnav && bnav.querySelector('[data-page="insights"].bnav-item');
      assert('Bnav: Insights item removed from bottom nav', !insightsBtn);
      const studyIcon = studyBtn && studyBtn.querySelector('.bnav-icon');
      assert('Bnav: Study uses school icon', studyIcon && studyIcon.textContent.trim() === 'school');
    })();

    (function testInsightsSidebar() {
      const sidebarInsights = document.querySelector('.sidebar [data-page="insights"].nav-item');
      assert('Sidebar: Insights nav-item still present', !!sidebarInsights);
    })();

    (function testBnavCount() {
      const bnav = document.getElementById('bottom-nav');
      const items = bnav && bnav.querySelectorAll('.bnav-item');
      assert('Bnav: exactly 5 items', items && items.length === 5);
    })();

    (function testDpYearClasses() {
      const origDate = typeof dpCurrentDate !== 'undefined' ? dpCurrentDate : null;
      if (typeof renderDPYearGrid === 'function' && document.getElementById('dp-year-grid')) {
        if (typeof dpCurrentDate !== 'undefined') dpCurrentDate = new Date().toISOString().slice(0,10);
        renderDPYearGrid();
        const grid = document.getElementById('dp-year-grid');
        const selectedBtns  = grid && grid.querySelectorAll('.dp-year-btn.selected');
        const currentBtns   = grid && grid.querySelectorAll('.dp-year-btn.current-year');
        assert('DpYear: at most one selected button', !selectedBtns || selectedBtns.length <= 1);
        assert('DpYear: at most one current-year button', !currentBtns || currentBtns.length <= 1);
        if (selectedBtns && selectedBtns.length === 1 && selectedBtns[0].classList.contains('current-year')) {
          assert('DpYear: current-year.selected button exists', true);
        }
        if (origDate && typeof dpCurrentDate !== 'undefined') dpCurrentDate = origDate;
      } else {
        assert('DpYear: year grid element exists', !!document.getElementById('dp-year-grid'));
      }
    })();

    (function testTPSegmentContrast() {
      openTimePicker('10:30', () => {});
      const hourBtn = document.getElementById('tp-hour-btn');
      const minBtn  = document.getElementById('tp-min-btn');
      assert('TP contrast: hour button active class on open', hourBtn && hourBtn.classList.contains('active'));
      assert('TP contrast: minute button not active on open', minBtn && !minBtn.classList.contains('active'));
      tpMode = 'minute';
      updateTPSegments();
      assert('TP contrast: hour button loses active after switch', hourBtn && !hourBtn.classList.contains('active'));
      assert('TP contrast: minute button gains active after switch', minBtn && minBtn.classList.contains('active'));
      closeTimePicker();
    })();

    (function testDpDayClasses() {
      if (typeof renderDPCalendar !== 'function') {
        assert('DP: renderDPCalendar accessible', false); return;
      }
      if (typeof dpCurrentDate !== 'undefined') {
        const saved = dpCurrentDate;
        dpCurrentDate = new Date().toISOString().slice(0,10);
        const calView = document.getElementById('dp-calendar-view');
        const yrView  = document.getElementById('dp-year-view');
        if (calView) calView.style.display = '';
        if (yrView)  yrView.style.display  = 'none';
        renderDPCalendar();
        const days = document.getElementById('dp-days');
        if (days) {
          const todayBtns    = days.querySelectorAll('.dp-day.today');
          const selectedBtns = days.querySelectorAll('.dp-day.selected');
          const otherBtns    = days.querySelectorAll('.dp-day.other-month');
          assert('DP: at most one today marker', todayBtns.length <= 1);
          assert('DP: other-month days present', otherBtns.length >= 0);
        }
        dpCurrentDate = saved;
      }
    })();

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    return { passed, failed };
  }
};
