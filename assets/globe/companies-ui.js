// Company explorer UI: search, sector filters, hero card, detail panel (desktop) / bottom sheet (phone)
// and the accessible company list. Works without WebGL; talks to the globe through DOM events:
//   guidify:select  { id, origin }   a company was chosen (from search, list or globe)
//   guidify:filter  { sector }       the sector filter changed
//   guidify:close                    the detail view closed

const SECTORS = ['Software & AI', 'Finance & Fintech', 'Commerce', 'Media & Entertainment', 'Infrastructure & Technology', 'Other'];
const SHORT = { 'Infrastructure & Technology': 'Infrastructure' };
const phone = matchMedia('(max-width: 900px)');
const $ = (id) => document.getElementById(id);

const input = $('search-input');
const listbox = $('search-list');
const chipsEl = $('sector-chips');
const statusEl = $('finder-status');
const heroCard = $('hero-card');
const panel = $('panel');
const scrim = $('scrim');
const listBody = $('list-body');

let companies = [];
let byId = new Map();
let sector = 'All';
let matches = [];
let active = -1;
let opener = null;

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));
const initials = (name) => name.replace(/\(.*?\)/g, '').replace(/[^A-Za-z]/g, '').slice(0, 2);
const metaLine = (c) => `${c.city}, ${c.country} · Founded ${c.founded}`;

function logoHTML(c) {
  return c.logo
    ? `<span class="co-logo" aria-hidden="true"><i style="--logo:url('${esc(c.logo)}')"></i></span>`
    : `<span class="co-logo" aria-hidden="true">${esc(initials(c.name))}</span>`;
}
function badgeHTML(c) {
  return c.status === 'verified' ? '' : '<span class="badge-unv">Unverified · source pending</span>';
}
function storyHTML(c) {
  let h = '';
  if (c.problem) h += `<div><p class="co-label">Original problem</p><p class="co-text">${esc(c.problem)}</p></div>`;
  if (c.solution) h += `<div><p class="co-label">Solution</p><p class="co-text">${esc(c.solution)}</p></div>`;
  if (c.story) h += `<div><p class="co-label">How it started</p><p class="co-text">${esc(c.story)}</p></div>`;
  return h;
}

// ---------- Hero card (desktop) ----------
function showHeroCard(c) {
  heroCard.innerHTML = `<article class="card" aria-label="${esc(c.name)}">
    <div class="co-head">${logoHTML(c)}<div><h2 class="co-name">${esc(c.name)}</h2><div class="co-meta">${esc(metaLine(c))}</div></div></div>
    ${storyHTML(c)}
    <div class="co-foot">${badgeHTML(c) || '<span></span>'}<button type="button" class="co-more" data-open="${esc(c.id)}">Read the full story →</button></div>
  </article>`;
}

// ---------- Detail panel / bottom sheet ----------
function panelHTML(c) {
  const src = c.sources && c.sources.length
    ? `<p class="sources">Sources: ${c.sources.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${i + 1}</a>`).join(', ')}</p>`
    : '<p class="sources">Sources: pending review. This story will show its source links once verified.</p>';
  return `<button type="button" class="sheet-handle" aria-label="Expand or collapse"></button>
    <button type="button" class="panel-close" aria-label="Close">✕</button>
    <div class="co-head">${logoHTML(c)}${badgeHTML(c)}</div>
    <h2 id="panel-title">${esc(c.name)}</h2>
    <p class="co-meta peek-only">${esc(metaLine(c))}</p>
    <dl class="facts panel-more">
      <div><dt>Founded</dt><dd>${esc(c.founded)}</dd></div>
      <div><dt>Founding city</dt><dd>${esc(c.city)}</dd></div>
      <div><dt>Country</dt><dd>${esc(c.country)}</dd></div>
      <div><dt>Sector</dt><dd>${esc(c.sector)}</dd></div>
    </dl>
    ${storyHTML(c)}
    <button type="button" class="co-more peek-only" data-expand>Read more ↑</button>
    <div class="panel-more">${src}</div>
    <p class="note panel-more">Shown where the company was founded, not its current headquarters. ${esc(c.name)} is not affiliated with or endorsed by Guidify.</p>`;
}

function openPanel(c, { peek = false } = {}) {
  opener = document.activeElement;
  panel.innerHTML = panelHTML(c);
  panel.classList.toggle('is-peek', phone.matches && peek);
  panel.hidden = false;
  scrim.hidden = false;
  panel.querySelector('.panel-close').focus({ preventScroll: true });
}
function closePanel() {
  if (panel.hidden) return;
  panel.hidden = true;
  scrim.hidden = true;
  panel.classList.remove('is-peek');
  // On desktop the hero card still shows the company, so it stays selected.
  if (phone.matches) emit('guidify:close');
  if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
  opener = null;
}
function expandSheet() { panel.classList.remove('is-peek'); }

panel.addEventListener('click', (e) => {
  if (e.target.closest('.panel-close')) closePanel();
  else if (e.target.closest('[data-expand]')) expandSheet();
  else if (e.target.closest('.sheet-handle')) panel.classList.contains('is-peek') ? expandSheet() : closePanel();
});
scrim.addEventListener('click', closePanel);
document.addEventListener('keydown', (e) => {
  if (panel.hidden) return;
  if (e.key === 'Escape') { e.preventDefault(); closePanel(); }
  if (e.key === 'Tab') { // keep focus inside the dialog
    const f = [...panel.querySelectorAll('button, a[href]')].filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
// Swipe the sheet: up expands, down closes.
let sy = null;
panel.addEventListener('touchstart', (e) => { sy = e.touches[0].clientY; }, { passive: true });
panel.addEventListener('touchend', (e) => {
  if (sy === null || !phone.matches) return;
  const dy = e.changedTouches[0].clientY - sy; sy = null;
  const atTop = panel.scrollTop <= 0;
  if (dy < -40 && panel.classList.contains('is-peek')) expandSheet();
  else if (dy > 60 && atTop) closePanel();
}, { passive: true });
// Scrolling the page while the sheet only peeks closes it.
addEventListener('scroll', () => { if (!panel.hidden && panel.classList.contains('is-peek')) closePanel(); }, { passive: true });

// ---------- Selection ----------
function select(id, origin, { open = false } = {}) {
  const c = byId.get(id);
  if (!c) return;
  emit('guidify:select', { id, origin });
  if (phone.matches) openPanel(c, { peek: !open });
  else if (open) openPanel(c);
  else showHeroCard(c);
}
heroCard.addEventListener('click', (e) => {
  const b = e.target.closest('[data-open]');
  if (b) openPanel(byId.get(b.dataset.open));
});
document.addEventListener('guidify:pick', (e) => select(e.detail.id, 'globe'));

// ---------- Search (combobox) ----------
function pool() { return sector === 'All' ? companies : companies.filter((c) => c.sector === sector); }
function renderSuggest() {
  const q = norm(input.value.trim());
  if (!q) { closeSuggest(); return; }
  const p = pool();
  const starts = p.filter((c) => norm(c.name).startsWith(q));
  const rest = p.filter((c) => !starts.includes(c) && (norm(c.name).includes(q) || norm(c.city).includes(q) || norm(c.country).includes(q)));
  matches = [...starts, ...rest].slice(0, 6);
  active = matches.length ? 0 : -1;
  if (!matches.length) {
    listbox.innerHTML = `<li class="empty" role="option" aria-disabled="true">No companies match “${esc(input.value.trim())}”. Try a company name or a city.</li>`;
    statusEl.textContent = 'No companies match.';
  } else {
    listbox.innerHTML = matches.map((c, i) => `<li role="option" id="opt-${i}" data-id="${esc(c.id)}" aria-selected="${i === active}">${esc(c.name)}<span>${esc(c.city)} · ${esc(c.founded)}</span></li>`).join('');
    statusEl.textContent = `${matches.length} ${matches.length === 1 ? 'company' : 'companies'} found.`;
  }
  listbox.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('aria-activedescendant', active >= 0 ? `opt-${active}` : '');
}
function setActive(i) {
  if (!matches.length) return;
  active = (i + matches.length) % matches.length;
  listbox.querySelectorAll('[role=option]').forEach((li, k) => li.setAttribute('aria-selected', String(k === active)));
  input.setAttribute('aria-activedescendant', `opt-${active}`);
}
function closeSuggest() {
  listbox.hidden = true; listbox.innerHTML = ''; matches = []; active = -1;
  input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
}
function choose(c) {
  input.value = c.name;
  closeSuggest();
  select(c.id, 'search');
}
input.addEventListener('input', renderSuggest);
input.addEventListener('focus', () => { if (input.value.trim()) renderSuggest(); });
input.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); listbox.hidden ? renderSuggest() : setActive(active + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
  else if (e.key === 'Enter') { e.preventDefault(); if (active >= 0 && matches[active]) choose(matches[active]); }
  else if (e.key === 'Escape') { if (!listbox.hidden) { e.preventDefault(); closeSuggest(); } else if (input.value) { input.value = ''; } else { input.blur(); } }
});
listbox.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the input
listbox.addEventListener('click', (e) => {
  const li = e.target.closest('li[data-id]');
  if (li) choose(byId.get(li.dataset.id));
});
input.addEventListener('blur', () => setTimeout(closeSuggest, 120));
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  e.preventDefault();
  input.focus();
});

// ---------- Sector chips ----------
function renderChips() {
  chipsEl.innerHTML = ['All', ...SECTORS].map((s) => {
    const on = s === sector;
    const label = SHORT[s] || s;
    return `<button type="button" class="chip" data-sector="${esc(s)}" aria-pressed="${on}"${s !== 'All' && on ? ` aria-label="${esc(s)}, selected. Clear filter"` : ''}>${esc(label)}${s !== 'All' && on ? '<span class="x" aria-hidden="true">×</span>' : ''}</button>`;
  }).join('');
}
chipsEl.addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  const s = b.dataset.sector;
  sector = s === sector && s !== 'All' ? 'All' : s;
  renderChips();
  chipsEl.querySelector(`[data-sector="${CSS.escape(sector)}"]`)?.focus();
  const n = pool().length;
  statusEl.textContent = sector === 'All' ? `Showing all ${n} companies.` : (n ? `Showing ${n} companies in ${sector}.` : `No companies in ${sector} yet.`);
  emit('guidify:filter', { sector });
  if (input.value.trim()) renderSuggest();
});

// ---------- Company list ----------
function renderList() {
  const rows = [...companies].sort((a, b) => a.name.localeCompare(b.name));
  listBody.innerHTML = rows.map((c) => `<tr><td><button type="button" data-id="${esc(c.id)}">${esc(c.name)}</button></td><td>${esc(c.city)}, ${esc(c.country)}</td><td>${esc(c.founded)}</td><td>${esc(c.sector)}</td></tr>`).join('');
}
listBody.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-id]');
  if (b) select(b.dataset.id, 'list', { open: true });
});

// ---------- Boot ----------
(async () => {
  try {
    companies = await (await fetch('assets/globe/companies.json')).json();
  } catch (err) {
    statusEl.textContent = 'The company list could not be loaded.';
    $('company-count').textContent = 'The company list could not be loaded. Please refresh the page.';
    return;
  }
  byId = new Map(companies.map((c) => [c.id, c]));
  renderChips();
  renderList();
  $('company-count').textContent = `${companies.length} companies, the problems they solved and where they began.`;
  $('list-count').textContent = `${companies.length} ↓`;
})();
