let allRecipes = [];

const FILTER_IDS = ['search', 'cuisine', 'time', 'category'];

// ── Load data ──────────────────────────────────────────
async function loadRecipes() {
  const res = await fetch('data/recipes.json');
  allRecipes = await res.json();
  populateFilters();
  renderLatest();
  renderFooterChips();
  renderGrid(allRecipes);
}

// ── Card markup (shared: latest row + grid) ────────────
function cardHTML(recipe) {
  return `
    <button class="recipe-card" data-id="${recipe.id}" aria-label="Open ${recipe.title}">
      ${recipe.photo
        ? `<img class="recipe-card-img" src="${recipe.photo}" alt="${recipe.title}" loading="lazy" />`
        : `<div class="recipe-card-img"></div>`}
      <span class="recipe-card-body">
        <span class="recipe-card-title">${recipe.title}</span>
        <span class="recipe-card-tags">${recipe.cuisine}, ${recipe.category} &middot; ${formatTime(recipe.totalMinutes)}</span>
      </span>
    </button>`;
}

function wireCards(container) {
  container.querySelectorAll('.recipe-card').forEach(card => {
    card.addEventListener('click', () => openModal(parseInt(card.dataset.id)));
  });
}

// ── Latest row (most recently added = highest id) ──────
function renderLatest() {
  const row = document.getElementById('latest-row');
  const latest = [...allRecipes].sort((a, b) => b.id - a.id).slice(0, 6);
  row.innerHTML = latest.map(cardHTML).join('');
  wireCards(row);
}

// ── Populate filter dropdowns from data ────────────────
function populateFilters() {
  fillSelect('cuisine', [...new Set(allRecipes.map(r => r.cuisine))].sort());
  fillSelect('category', [...new Set(allRecipes.map(r => r.category))].sort());
}

function fillSelect(id, values) {
  const sel = document.getElementById(id);
  values.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    sel.appendChild(opt);
  });
}

// ── Footer chips (cuisine / category) act as filters ───
function renderFooterChips() {
  const cuisines = [...new Set(allRecipes.map(r => r.cuisine))].sort();
  const categories = [...new Set(allRecipes.map(r => r.category))].sort();

  document.getElementById('cuisine-chips').innerHTML =
    cuisines.map(c => `<button class="chip" data-filter="cuisine" data-value="${c}">${c}</button>`).join('');
  document.getElementById('category-chips').innerHTML =
    categories.map(c => `<button class="chip" data-filter="category" data-value="${c}">${c}</button>`).join('');

  document.querySelectorAll('.chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      const sel = document.getElementById(chip.dataset.filter);
      // reset other filters for a clean focused view
      FILTER_IDS.forEach(id => { document.getElementById(id).value = ''; });
      sel.value = chip.dataset.value;
      FILTER_IDS.forEach(syncFilterActive);
      refreshClearBtn();
      renderGrid(getFiltered());
      scrollToId('all-recipes');
    });
  });
}

// ── Filter logic ───────────────────────────────────────
function getFiltered() {
  const query    = document.getElementById('search').value.toLowerCase().trim();
  const cuisine  = document.getElementById('cuisine').value;
  const maxTime  = parseInt(document.getElementById('time').value) || Infinity;
  const category = document.getElementById('category').value;

  return allRecipes.filter(r => {
    const matchesQuery = !query ||
      r.title.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      r.ingredients.some(i => i.toLowerCase().includes(query));
    return matchesQuery &&
      (!cuisine  || r.cuisine === cuisine) &&
      (r.totalMinutes <= maxTime) &&
      (!category || r.category === category);
  });
}

// ── Render grid ────────────────────────────────────────
function renderGrid(recipes) {
  const grid = document.getElementById('recipe-grid');
  const count = document.getElementById('result-count');

  count.textContent = recipes.length === allRecipes.length
    ? `${recipes.length} recipes`
    : `${recipes.length} of ${allRecipes.length}`;

  if (recipes.length === 0) {
    grid.innerHTML = `<div class="empty-state"><p>No recipes match your filters.</p></div>`;
    return;
  }

  grid.innerHTML = recipes.map(cardHTML).join('');
  wireCards(grid);
}

function formatTime(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ── Modal ──────────────────────────────────────────────
function openModal(id) {
  const recipe = allRecipes.find(r => r.id === id);
  if (!recipe) return;

  const hasIngredients = recipe.ingredients && recipe.ingredients.length > 0;
  const hasInstructions = recipe.instructions && recipe.instructions.length > 0;
  const hasNotes = recipe.notes &&
    !recipe.notes.startsWith('Recipe to be filled in');

  document.getElementById('modal-content').innerHTML = `
    <div class="recipe-view">
      <div class="recipe-view-header">
        <p class="recipe-view-category">${recipe.cuisine} &middot; ${recipe.category}</p>
        <h2 class="recipe-view-title">${recipe.title}</h2>
        <p class="recipe-view-desc">${recipe.description}</p>
        <div class="recipe-view-pills">
          <span class="recipe-pill">${formatTime(recipe.totalMinutes)}</span>
          ${recipe.serves ? `<span class="recipe-pill">Serves ${recipe.serves}</span>` : ''}
        </div>
      </div>

      ${recipe.photo ? `<div class="recipe-gallery"><img src="${recipe.photo}" alt="${recipe.title}" /></div>` : ''}

      <div class="recipe-view-body">
        <div>
          <div class="recipe-col-head"><h3>Ingredients</h3></div>
          ${hasIngredients
            ? `<ul class="ingredient-list">${recipe.ingredients.map(i => `<li>${i}</li>`).join('')}</ul>`
            : `<p class="recipe-col-empty">Ingredients coming soon.</p>`}
        </div>
        <div>
          <div class="recipe-col-head"><h3>Method</h3></div>
          ${hasInstructions
            ? `<ol class="method-steps">${recipe.instructions.map((s, i) =>
                `<li><span class="step-num">${i + 1}</span><p class="step-text">${s}</p></li>`).join('')}</ol>`
            : `<p class="recipe-col-empty">Method coming soon.</p>`}
        </div>
      </div>

      ${hasNotes ? `<p class="recipe-view-notes">${recipe.notes}</p>` : ''}
    </div>`;

  const modal = document.getElementById('recipe-modal');
  modal.showModal();
  modal.scrollTop = 0;
}

function closeModal() { document.getElementById('recipe-modal').close(); }

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('recipe-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Filter wiring ──────────────────────────────────────
function syncFilterActive(id) {
  const el = document.getElementById(id);
  el.classList.toggle('active', el.value !== '');
}

function anyFilterActive() {
  return FILTER_IDS.some(id => document.getElementById(id).value !== '');
}

function refreshClearBtn() {
  document.getElementById('clear-filters').hidden = !anyFilterActive();
}

FILTER_IDS.forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    syncFilterActive(id);
    refreshClearBtn();
    renderGrid(getFiltered());
  });
});

document.getElementById('clear-filters').addEventListener('click', () => {
  FILTER_IDS.forEach(id => {
    const el = document.getElementById(id);
    el.value = '';
    el.classList.remove('active');
  });
  refreshClearBtn();
  renderGrid(allRecipes);
});

// ── Smooth-scroll buttons (topbar, "See all", hero, chips) ──
function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
document.querySelectorAll('[data-scroll]').forEach(btn => {
  btn.addEventListener('click', () => scrollToId(btn.dataset.scroll));
});

// "Search" in the top bar jumps to filters and focuses the input
document.getElementById('search-jump').addEventListener('click', () => {
  setTimeout(() => document.getElementById('search').focus(), 400);
});

// ── Dismiss the floating Dispatch note ─────────────────
document.getElementById('dispatch-close').addEventListener('click', () => {
  document.getElementById('dispatch-float').hidden = true;
});

// ── Init ───────────────────────────────────────────────
loadRecipes();
