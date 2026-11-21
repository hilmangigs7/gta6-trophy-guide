// Leonida Trophy Guide: renders the 55 trophies from data/trophies.json, tracks earned
// trophies in localStorage, and filters by kind, grade and search. Works fully offline:
// the only request it makes is the relative fetch of its own data file.
const STORAGE_KEY = 'gta6-trophy-checklist';
const KIND_LABELS = { story: 'Story', missable: 'Missable', collectible: 'Collectible', activity: 'Activity', side: 'Side quest', crime: 'Crime', misc: 'Misc', online: 'Online' };
const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];

const searchInput = document.getElementById('search');
const gradeSelect = document.getElementById('grade');
const spoilersBox = document.getElementById('spoilers');
const kindButtons = [...document.querySelectorAll('#kindFilters button')];
const cardsEl = document.getElementById('cards');
const emptyState = document.getElementById('emptyState');
const listCount = document.getElementById('listCount');

let trophies = [];
let roadmap = [];
let sources = [];
let earned = loadEarned();
let state = { kind: 'all', grade: 'all', search: '', spoilers: false };

async function loadTrophies() {
  const response = await fetch('data/trophies.json');
  const doc = await response.json();
  trophies = doc.trophies;
  roadmap = doc.roadmap ?? [];
  sources = doc.sources ?? [];
}

function readUrlParams() {
  const params = new URLSearchParams(location.search);
  if (params.has('grade')) state.grade = params.get('grade');
  if (params.has('kind')) state.kind = params.get('kind');
  if (params.has('search')) state.search = params.get('search');
  if (params.get('spoilers') === 'on') state.spoilers = true;
}

function loadEarned() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    const names = Array.isArray(raw) ? raw : (raw.earned ?? []);
    return new Set(names.filter((n) => typeof n === 'string'));
  } catch {
    return new Set();
  }
}

function saveEarned() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
}

function formatCount(trophy) {
  if (trophy.count == null) return '';
  if (trophy.count >= 1000) return 'Target: $' + trophy.count.toLocaleString('en-US');
  return 'Target: ' + trophy.count;
}

function renderProgress() {
  const total = trophies.length;
  const done = trophies.filter((t) => earned.has(t.name)).length;
  document.getElementById('progressText').textContent = `${done} of ${total} earned`;
  document.getElementById('progressPct').textContent = total ? Math.round((done / total) * 100) + '%' : '0%';
  document.getElementById('progressFill').style.width = total ? (done / total) * 100 + '%' : '0%';
  document.getElementById('progressGrades').textContent = GRADE_ORDER.map((g) => {
    const inGrade = trophies.filter((t) => t.grade === g);
    const doneInGrade = inGrade.filter((t) => earned.has(t.name)).length;
    return `${g[0].toUpperCase() + g.slice(1)} ${doneInGrade}/${inGrade.length}`;
  }).join(' · ');
}

function renderRoadmapStrip() {
  const stripEl = document.getElementById('stripStages');
  stripEl.replaceChildren();
  for (const stage of roadmap) {
    const mini = document.createElement('div');
    mini.className = 'mini-stage';
    const title = document.createElement('p');
    title.className = 'mini-title';
    title.textContent = `${stage.stage} · ${stage.title}`;
    const meta = document.createElement('p');
    meta.className = 'mini-meta';
    meta.textContent = `${stage.hours} · ${stage.trophies.length} trophies`;
    mini.append(title, meta);
    stripEl.append(mini);
  }
}

function renderRoadmap() {
  const stagesEl = document.getElementById('stages');
  stagesEl.replaceChildren();
  const byId = new Map(trophies.map((t) => [t.id, t]));
  for (const stage of roadmap) {
    const card = document.createElement('article');
    card.className = 'stage';
    const head = document.createElement('h3');
    head.textContent = `Stage ${stage.stage} · ${stage.title}`;
    const hours = document.createElement('p');
    hours.className = 'stage-hours';
    hours.textContent = stage.hours;
    const blurb = document.createElement('p');
    blurb.textContent = stage.blurb;
    const names = document.createElement('p');
    names.className = 'stage-trophies';
    names.textContent = stage.trophies.map((id) => byId.get(id)?.name ?? '').filter(Boolean).join(' · ');
    card.append(head, hours, blurb, names);
    stagesEl.append(card);
  }
}

function renderSources() {
  const list = document.getElementById('sourceList');
  list.replaceChildren();
  for (const source of sources) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = source.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = source.name;
    li.append(a);
    list.append(li);
  }
}

function trophyCard(trophy) {
  const isEarned = earned.has(trophy.name);
  const masked = state.spoilers && trophy.kind === 'story' && !isEarned;
  const card = document.createElement('article');
  card.className = 'card' + (isEarned ? ' earned' : '') + (trophy.missable ? ' missable-card' : '');
  card.dataset.name = trophy.name;

  const top = document.createElement('div');
  top.className = 'card-top';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned;
  box.setAttribute('aria-label', 'Mark ' + trophy.name + ' as earned');
  box.addEventListener('change', () => toggleEarned(trophy.name, box.checked));
  const badge = document.createElement('span');
  badge.className = 'badge grade-' + trophy.grade;
  badge.textContent = trophy.grade;
  const kind = document.createElement('span');
  kind.className = 'tag kind-' + trophy.kind;
  kind.textContent = KIND_LABELS[trophy.kind] ?? trophy.kind;
  top.append(box, badge, kind);
  if (trophy.hidden) {
    const hidden = document.createElement('span');
    hidden.className = 'tag hidden-tag';
    hidden.textContent = 'Hidden';
    top.append(hidden);
  }
  if (trophy.missable) {
    const flag = document.createElement('span');
    flag.className = 'tag missable-tag';
    flag.textContent = '⚠ Possibly missable';
    top.append(flag);
  }
  card.append(top);

  const name = document.createElement('h3');
  name.textContent = masked ? 'Hidden story trophy' : trophy.name;
  card.append(name);

  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = masked ? 'A story trophy. Earn it to reveal its name and description.' : trophy.description;
  card.append(desc);

  if (!masked) {
    const target = formatCount(trophy);
    if (target) {
      const targetEl = document.createElement('p');
      targetEl.className = 'target';
      targetEl.textContent = target;
      card.append(targetEl);
    }
    const guide = document.createElement('p');
    guide.className = 'guide';
    guide.textContent = trophy.guide;
    card.append(guide);
    const source = document.createElement('p');
    source.className = 'source';
    source.textContent = 'Source: ';
    const link = document.createElement('a');
    link.href = trophy.source.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = trophy.source.name;
    source.append(link);
    card.append(source);
  } else {
    const note = document.createElement('p');
    note.className = 'guide masked-note';
    note.textContent = 'Guide hidden until earned — the story stays unspoiled.';
    card.append(note);
  }
  return card;
}

function applyFilters() {
  const query = state.search.trim().toLowerCase();
  return trophies.filter((t) => {
    if (state.kind === 'online') return false;
    if (state.kind === 'missable' && !t.missable) return false;
    if (state.kind !== 'all' && state.kind !== 'missable' && t.kind !== state.kind) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (query && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(query)) return false;
    return true;
  });
}

function renderTrophies() {
  const shown = applyFilters();
  cardsEl.replaceChildren();
  for (const trophy of shown) cardsEl.append(trophyCard(trophy));
  listCount.textContent = `showing ${shown.length} of ${trophies.length}`;
  emptyState.hidden = shown.length !== 0;
}

function toggleEarned(name, isEarned) {
  if (isEarned) earned.add(name);
  else earned.delete(name);
  saveEarned();
  renderProgress();
  renderTrophies();
}

function exportProgress() {
  const payload = { game: 'Grand Theft Auto VI', earned: [...earned].sort(), exported_at: new Date().toISOString() };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  if (!file) return;
  const raw = JSON.parse(await file.text());
  const names = Array.isArray(raw) ? raw : (raw.earned ?? []);
  const known = new Set(trophies.map((t) => t.name));
  earned = new Set(names.filter((n) => known.has(n)));
  saveEarned();
  renderProgress();
  renderTrophies();
}

function syncControls() {
  searchInput.value = state.search;
  gradeSelect.value = GRADE_ORDER.includes(state.grade) ? state.grade : 'all';
  spoilersBox.checked = state.spoilers;
  for (const button of kindButtons) {
    button.classList.toggle('active', button.dataset.kind === state.kind);
  }
}

function init() {
  readUrlParams();
  searchInput.addEventListener('input', () => { state.search = searchInput.value; renderTrophies(); });
  gradeSelect.addEventListener('change', () => { state.grade = gradeSelect.value; renderTrophies(); });
  spoilersBox.addEventListener('change', () => { state.spoilers = spoilersBox.checked; renderTrophies(); });
  for (const button of kindButtons) {
    button.addEventListener('click', () => { state.kind = button.dataset.kind; syncControls(); renderTrophies(); });
  }
  document.getElementById('export').addEventListener('click', exportProgress);
  document.getElementById('import').addEventListener('change', (event) => importProgress(event.target.files[0]));
  syncControls();
}

await loadTrophies();
renderProgress();
renderRoadmapStrip();
renderRoadmap();
renderSources();
init();
renderTrophies();
