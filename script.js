const API_BASE = 'https://pokeapi.co/api/v2';
const LIMIT = 20;

const state = {
  offset: 0,
  cache: new Map(), 
  caught: new Set(), 
};

const elements = {
  grid: null,
  moreBtn: null,
  modal: null,
  modalContent: null,
  modalClose: null,
  caughtList: null,
  clearCaughtBtn: null,
  showCaughtBtn: null,
};

function getLocalCaught() {
  try {
    const raw = localStorage.getItem('caughtPokemon');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading localStorage', err);
    return [];
  }
}
function setLocalCaught(arr) {
  try {
    localStorage.setItem('caughtPokemon', JSON.stringify(arr));
  } catch (err) {
    console.error('Error writing localStorage', err);
  }
}

function renderCard(pokemon) {
  const col = document.createElement('div');
  col.className = 'col-12 col-sm-6 col-md-4';

  const card = document.createElement('div');
  card.className = 'pokemon-card';
  card.tabIndex = 0;
  card.setAttribute('data-name', pokemon.name);

  
  const id = extractIdFromUrl(pokemon.url);
  const thumbUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

  const thumb = document.createElement('div');
  thumb.className = 'pokemon-thumb';
  const img = document.createElement('img');
  img.alt = pokemon.name;
  img.src = thumbUrl;
  img.loading = 'lazy';
  thumb.appendChild(img);

  const info = document.createElement('div');
  info.style.flex = '1';
  const nameEl = document.createElement('div');
  nameEl.className = 'pokemon-name';
  nameEl.textContent = pokemon.name;

  const meta = document.createElement('div');
  meta.className = 'pokemon-meta d-flex gap-2 align-items-center';
  const idSpan = document.createElement('small');
  idSpan.textContent = `#${id.toString().padStart(3, '0')}`;
  meta.appendChild(idSpan);

  info.appendChild(nameEl);
  info.appendChild(meta);

  const right = document.createElement('div');
  right.className = 'd-flex flex-column align-items-end gap-2';
  const caughtBadge = document.createElement('span');
  caughtBadge.className = 'caught-badge';
  caughtBadge.textContent = 'Caught';
  caughtBadge.style.display = state.caught.has(String(id)) ? 'inline-block' : 'none';

  right.appendChild(caughtBadge);

  card.appendChild(thumb);
  card.appendChild(info);
  card.appendChild(right);

  
  card.addEventListener('click', () => openPokemonDetail(pokemon.name, pokemon.url));
  card.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      openPokemonDetail(pokemon.name, pokemon.url);
    }
  });

  col.appendChild(card);
  return col;
}

function extractIdFromUrl(url) {
  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

async function fetchList(offset) {
  const url = `${API_BASE}/pokemon?limit=${LIMIT}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch Pokémon list');
  return res.json();
}

async function fetchDetailsByNameOrId(nameOrId) {
  if (state.cache.has(nameOrId)) return state.cache.get(nameOrId);
  const res = await fetch(`${API_BASE}/pokemon/${nameOrId}`);
  if (!res.ok) throw new Error('Failed to fetch details');
  const data = await res.json();
  state.cache.set(nameOrId, data);
  return data;
}

async function loadInitial() {
  elements.moreBtn.disabled = true;
  try {
    const data = await fetchList(state.offset);
    renderList(data.results);
    state.offset += LIMIT;
  } catch (err) {
    console.error(err);
    alert('Error loading Pokémon — check network and try again.');
  } finally {
    elements.moreBtn.disabled = false;
  }
}

function renderList(list) {
  for (const p of list) {
    const card = renderCard(p);
    elements.grid.appendChild(card);
  }
}

async function handleMore() {
  elements.moreBtn.disabled = true;
  elements.moreBtn.textContent = 'Loading...';
  try {
    const data = await fetchList(state.offset);
    renderList(data.results);
    state.offset += LIMIT;
  } catch (err) {
    console.error(err);
    alert('Error fetching more Pokémon');
  } finally {
    elements.moreBtn.disabled = false;
    elements.moreBtn.textContent = 'More';
  }
}

function openModal() {
  elements.modal.setAttribute('aria-hidden', 'false');
  elements.modalClose.focus();
}
function closeModal() {
  elements.modal.setAttribute('aria-hidden', 'true');
  elements.modalContent.innerHTML = '';
}

async function openPokemonDetail(name, url) {
  openModal();
  elements.modalContent.innerHTML = `<div class="p-3">Loading ${name}…</div>`;
  try {
    const details = await fetchDetailsByNameOrId(name);
    renderModalContent(details);
  } catch (err) {
    console.error(err);
    elements.modalContent.innerHTML = `<div class="p-3 text-danger">Failed to load details.</div>`;
  }
}

function renderModalContent(details) {
  const id = details.id;
  const capitalized = details.name; 
  const imgUrl = details.sprites.other?.['official-artwork']?.front_default
    || details.sprites.front_default
    || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

  const types = details.types.map(t => t.type.name);
  const abilities = details.abilities.map(a => a.ability.name);
  const stats = details.stats.map(s => ({ name: s.stat.name, value: s.base_stat }));

  const container = document.createElement('div');
  container.className = 'modal-body';

  const left = document.createElement('div');
  const img = document.createElement('img');
  img.src = imgUrl;
  img.alt = details.name;
  left.appendChild(img);
  left.appendChild(document.createElement('br'));
  const idEl = document.createElement('small');
  idEl.textContent = `#${String(id).padStart(3,'0')}`;
  left.appendChild(idEl);

  const right = document.createElement('div');

  const h = document.createElement('h3');
  h.textContent = capitalized;
  right.appendChild(h);

  const typeWrap = document.createElement('div');
  types.forEach(t => {
    const span = document.createElement('span');
    span.className = 'type-pill';
    span.textContent = t;
    typeWrap.appendChild(span);
  });
  right.appendChild(typeWrap);

  const abilitiesEl = document.createElement('p');
  abilitiesEl.innerHTML = `<strong>Abilities:</strong> ${abilities.join(', ')}`;
  right.appendChild(abilitiesEl);

  const statsEl = document.createElement('div');
  statsEl.innerHTML = `<strong>Stats:</strong>`;
  const statList = document.createElement('ul');
  statList.style.paddingLeft = '1rem';
  for (const s of stats) {
    const li = document.createElement('li');
    li.textContent = `${s.name}: ${s.value}`;
    statList.appendChild(li);
  }
  statsEl.appendChild(statList);
  right.appendChild(statsEl);

  const actions = document.createElement('div');
  actions.className = 'mt-3 d-flex gap-2';

  const caughtBtn = document.createElement('button');
  caughtBtn.className = 'btn btn-success';
  const idStr = String(id);
  caughtBtn.textContent = state.caught.has(idStr) ? 'Release' : 'Mark as Caught';
  caughtBtn.addEventListener('click', () => {
    toggleCaught(details);
    caughtBtn.textContent = state.caught.has(idStr) ? 'Release' : 'Mark as Caught';
    refreshCaughtUI();
    updateGridBadgeForId(idStr);
  });

  actions.appendChild(caughtBtn);
  right.appendChild(actions);

  container.appendChild(left);
  container.appendChild(right);

  elements.modalContent.innerHTML = '';
  elements.modalContent.appendChild(container);
}

function updateGridBadgeForId(idStr) {
  const cards = document.querySelectorAll('.pokemon-card');
  cards.forEach(card => {
    const name = card.getAttribute('data-name');
    const thumb = card.querySelector('img');
    if (!name) return;
    const img = card.querySelector('.pokemon-thumb img');
    if (!img) return;
    const src = img.src || '';
    if (src.includes(`/${idStr}.png`)) {
      const badge = card.querySelector('.caught-badge');
      if (badge) badge.style.display = state.caught.has(idStr) ? 'inline-block' : 'none';
    }
  });
}

function toggleCaught(details) {
  const id = String(details.id);
  if (state.caught.has(id)) {
    state.caught.delete(id);
  } else {
    state.caught.add(id);
  }
  setLocalCaught(Array.from(state.caught));
}

function renderCaughtList() {
  elements.caughtList.innerHTML = '';
  if (state.caught.size === 0) {
    const li = document.createElement('li');
    li.className = 'list-group-item text-muted';
    li.textContent = 'No caught Pokémon yet.';
    elements.caughtList.appendChild(li);
    return;
  }

  const ids = Array.from(state.caught);
  ids.forEach(async (id) => {
    let details = state.cache.get(id);
    if (!details) {
      try {
        details = await fetchDetailsByNameOrId(id);
      } catch (err) {
        details = { id: Number(id), name: `#${id}` };
      }
    }
    const li = document.createElement('li');
    li.className = 'list-group-item caught-item d-flex justify-content-between align-items-center';
    li.setAttribute('data-id', String(details.id));
    const left = document.createElement('div');
    left.className = 'd-flex align-items-center gap-2';
    const img = document.createElement('img');
    img.src = details.sprites?.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${details.id}.png`;
    img.alt = details.name;
    const name = document.createElement('span');
    name.textContent = details.name;
    name.style.textTransform = 'capitalize';
    left.appendChild(img);
    left.appendChild(name);

    const buttons = document.createElement('div');
    buttons.className = 'd-flex gap-2';
    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn btn-sm btn-outline-primary';
    viewBtn.textContent = 'View';
    viewBtn.addEventListener('click', () => openPokemonDetail(details.name, `${API_BASE}/pokemon/${details.id}`));

    const releaseBtn = document.createElement('button');
    releaseBtn.className = 'btn btn-sm btn-outline-danger';
    releaseBtn.textContent = 'Release';
    releaseBtn.addEventListener('click', () => {
      state.caught.delete(String(details.id));
      setLocalCaught(Array.from(state.caught));
      renderCaughtList();
      updateGridBadgeForId(String(details.id));
    });

    buttons.appendChild(viewBtn);
    buttons.appendChild(releaseBtn);

    li.appendChild(left);
    li.appendChild(buttons);
    elements.caughtList.appendChild(li);
  });
}

function refreshCaughtUI() {
  renderCaughtList();
}

function setupEventListeners() {
  elements.moreBtn.addEventListener('click', handleMore);
  elements.modalClose.addEventListener('click', closeModal);
  elements.modal.addEventListener('click', (ev) => {
    if (ev.target === elements.modal) closeModal();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && elements.modal.getAttribute('aria-hidden') === 'false') {
      closeModal();
    }
  });
  elements.clearCaughtBtn.addEventListener('click', () => {
    if (!confirm('Release all caught Pokémon?')) return;
    state.caught.clear();
    setLocalCaught([]);
    refreshCaughtUI();
    document.querySelectorAll('.caught-badge').forEach(b => b.style.display = 'none');
  });

  elements.showCaughtBtn.addEventListener('click', () => {
    document.getElementById('caught-section').scrollIntoView({ behavior: 'smooth' });
  });
}

function wireUpElements() {
  elements.grid = document.getElementById('pokemon-grid');
  elements.moreBtn = document.getElementById('more-btn');
  elements.modal = document.getElementById('modal');
  elements.modalContent = document.getElementById('modal-content');
  elements.modalClose = document.getElementById('modal-close');
  elements.caughtList = document.getElementById('caught-list');
  elements.clearCaughtBtn = document.getElementById('clear-caught');
  elements.showCaughtBtn = document.getElementById('show-caught-btn');
}

async function init() {
  wireUpElements();
  setupEventListeners();

  const saved = getLocalCaught();
  if (Array.isArray(saved)) {
    saved.forEach(id => state.caught.add(String(id)));
  }

  refreshCaughtUI();

  await loadInitial();
}

document.addEventListener('DOMContentLoaded', init);