window.__APP_BOOTED__ = false;
// Minimal Markdown renderer (tiny)
function md(src = "") {
    return src
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');
  }
  
  /**
   * Starter notes — edit freely. Keep ids unique.
   */
  const SEED_NOTES = [
    {
      id: 'session-01-meeting-in-bryn-shander',
      title: 'Session 01 — Trouble in Bryn Shander',
      type: 'session',
      tags: ['sessions','bryn-shander','ten-towns'],
      body: `# Recap\n\nThe party arrived in **Bryn Shander** during heavy snow. Rumors mentioned giants harassing the Ten-Towns.\n\n### Key Events\n- Met Sheriff *Markham Southwell* and Speaker *Duvessa Shane*.\n- A frost giant scouting party searched for *Artus Cimber*.\n- Party defended the walls; townsfolk thankful.\n\n### Hooks\n- Follow leads on **Artus Cimber**.\n- Seek out the wandering giant ally **Harshnag**.`
    },
    {
      id: 'npc-harshnag-the-grim',
      title: 'Harshnag the Grim (NPC)',
      type: 'npc',
      img: 'https://via.placeholder.com/50?text=HN',
      tags: ['giants','ally','frost-giant'],
      body: `A battle-hardened **frost giant** who opposes the Ordning's chaos.\n\n- Favors mortals who stand against monstrous giants.\n- Often roams the **Spine of the World**.\n- Can guide the party to the **Eye of the All-Father**.`
    },
    {
      id: 'location-eye-of-the-all-father',
      title: 'Location — Eye of the All-Father',
      type: 'location',
      tags: ['temple','ancient','spine-of-the-world'],
      body: `Ancient giant temple hidden in the mountains.\n\n- Houses the oracle of **Annam**.\n- Answers questions when proper rites are observed.\n- Crucial to understanding the **Ordning** upheaval.`
    },
    {
      id: 'rule-house-critical-hits',
      title: 'House Rule — Critical Hits',
      type: 'rule',
      tags: ['rules','combat'],
      body: `**Crits:** Roll damage dice twice (\`2d\`) + modifiers once. Brutal Critical features add extra dice after doubling.`
    },
    {
      id: 'faction-harpers',
      title: 'Faction — Harpers',
      type: 'faction',
      tags: ['faction','harpers','allies'],
      body: `A semi-secret network promoting equality and opposing tyranny. Potential patrons or quest-givers in the North.`
    }
  ];
  
  // --- State ---
  let state = {
    q: '',
    filter: 'all',
    notes: [],
    activeIndex: 0, // keyboard selection in results
  };
  
  async function fetchNotes() {
    // Primary source: st-wiki-notes.json at project root
    try {
      const res = await fetch('st-wiki-notes.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} when fetching st-wiki-notes.json`);
      const data = await res.json();
  
      // Accept either a raw array or an object with a `notes` array
      const incoming = Array.isArray(data) ? data : (data && Array.isArray(data.notes) ? data.notes : null);
      if (!incoming) throw new Error('Invalid JSON shape: expected an array or an object with a `notes` array');
  
      state.notes = incoming;
      // Mirror to localStorage for quick subsequent loads/offline use
      saveNotes();
      return;
    } catch (e) {
      console.warn('Failed to load st-wiki-notes.json. Falling back. Reason:', e);
    }
  
    // Fallback 1: previously saved localStorage
    try {
      const raw = localStorage.getItem('st-wiki-notes');
      if (raw) {
        state.notes = JSON.parse(raw);
        return;
      }
    } catch (e) {
      console.warn('Failed to parse localStorage backup for st-wiki-notes:', e);
    }
  
    // Fallback 2: seed notes in this file
    state.notes = SEED_NOTES;
  }
  
  function saveNotes() {
    localStorage.setItem('st-wiki-notes', JSON.stringify(state.notes));
  }
  
  // --- Elements ---
  const elSearch = document.getElementById('search');
  const elResultList = document.getElementById('resultList');
  const elResultCount = document.getElementById('resultCount');
  const elReader = document.getElementById('reader');
  const elQuick = document.getElementById('quickList');
  const filterBtns = Array.from(document.querySelectorAll('.filter-btn'));
  const elResultsCard = document.getElementById('resultsCard');
  const elQuickCard = document.getElementById('quickNotesCard');
const elBtnClearSearch = document.getElementById('btnClearSearch');
  
  function typeBadge(t){
    const k = (t||'').toLowerCase();
    const cls = ['session','npc','location','rule','faction'].includes(k) ? k : 'session';
    const label = (t||'').charAt(0).toUpperCase() + (t||'').slice(1);
    return `<span class="type-badge type-${cls}">${label}</span>`;
  }
  
  // --- Helpers ---
  function avatarImg(n){
    if (n && n.type === 'npc' && n.img) {
      return `<img src="${escapeHtml(n.img)}" alt="${escapeHtml(n.title)}" class="avatar-50 avatar-ring">`;
    }
    return '';
  }
  function indexOfId(list, id) { return list.findIndex(n => n.id === id); }
  
  function normalize(s) { return (s || '').toLowerCase(); }
  
  function matches(note, q) {
    if (!q) return true;
    const s = normalize(q);
    return normalize(note.title).includes(s)
      || normalize(note.body).includes(s)
      || (note.tags || []).some(t => normalize(t).includes(s));
  }
  
  function typeAllows(note, filter) {
    if (filter === 'all') return true;
    // Tag-based filters use the prefix `tag:`
    if (filter && filter.startsWith('tag:')) {
      const tag = filter.slice(4).toLowerCase();
      return (note.tags || []).some(t => (t || '').toLowerCase() === tag);
    }
    return note.type === filter;
  }
  
  function sortedNotes(list) {
    // Simple sort: sessions newest first, else alphabetical
    return [...list].sort((a, b) => {
      if (a.type === 'session' && b.type !== 'session') return -1;
      if (b.type === 'session' && a.type !== 'session') return 1;
      return a.title.localeCompare(b.title);
    });
  }
  
  function filtered() {
    const list = state.notes.filter(n => typeAllows(n, state.filter) && matches(n, state.q));
    return sortedNotes(list);
  }
  
  function renderResults(forceShow = false) {
    // Show results in the left column only when a search query exists; otherwise show Quick Notes
    if (!state.q && !forceShow) {
      elResultCount.textContent = 0;
      elResultList.innerHTML = '';
      if (elResultsCard) elResultsCard.classList.add('hidden');
      if (elQuickCard) elQuickCard.classList.remove('hidden');
      return;
    } else {
      if (elResultsCard) elResultsCard.classList.remove('hidden');
      if (elQuickCard) elQuickCard.classList.add('hidden');
    }
    const items = filtered();
    elResultCount.textContent = items.length;
    if (items.length === 0) {
      elResultList.innerHTML = `
        <li class="px-4 py-6 text-sm text-slate-500">
          No results. Try different keywords or filters.
        </li>`;
      return;
    }
    elResultList.innerHTML = items.map((n, i) => `
      <li class="note-row px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 ${i === state.activeIndex ? 'bg-slate-100 dark:bg-slate-800' : ''}" data-id="${n.id}" data-index="${i}">
        <div class="flex items-start gap-3">
          ${avatarImg(n)}
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <div class="font-medium clamp-1">${n.title}</div>
              ${typeBadge(n.type)}
            </div>
            <div class="text-sm text-slate-600 clamp-1">${escapeHtml((n.body || '').replace(/\n/g,' ')).slice(0, 140)}…</div>
            <div class="mt-1 flex flex-wrap gap-1">${(n.tags||[]).map(t => `<span class="tag">${t}</span>`).join('')}</div>
          </div>
        </div>
      </li>
    `).join('');
  }
  
  function renderQuick() {
    const sections = [
      ['Latest Session', state.notes.find(n => n.type==='session')?.id],
      ['Harshnag', 'npc-harshnag-the-grim'],
      ['Eye of the All-Father', 'location-eye-of-the-all-father'],
      ['House Crit Rule', 'rule-house-critical-hits'],
    ];
    elQuick.innerHTML = sections.map(([label, id]) => id ? `<li><a class="text-indigo-600 hover:underline" href="#${id}">${label}</a></li>` : '').join('');
  }
  
  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }
  
  function openById(id) {
    const idx = indexOfId(state.notes, id);
    if (idx === -1) return;
    const n = state.notes[idx];
    const html = `
      <div class="flex items-center gap-3">
        ${avatarImg(n)}
        <div>
          <h2 class="mt-0 mb-0 font-extrabold">${n.title}</h2>
          <div class="mt-2 mb-3 flex items-center gap-2 flex-wrap">
            ${typeBadge(n.type)}
            <div class="flex flex-wrap gap-1">${(n.tags||[]).length ? (n.tags||[]).map(t => `<span class="tag">${t}</span>`).join('') : '<span class="text-sm text-slate-400">—</span>'}</div>
          </div>
        </div>
      </div>
      <hr class="mb-3"/>
      <div class="mt-2">${md(escapeHtml(n.body))}</div>
    `;
    elReader.innerHTML = html;
    // Update selection in results
    const items = filtered();
    const pos = items.findIndex(x => x.id === id);
    state.activeIndex = Math.max(0, pos);
    renderResults();
    // Scroll selected into view
    const activeEl = elResultList.querySelector(`[data-id="${id}"]`);
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
    // Hash for deep link
    location.hash = id;
  }
  
  function openActive() {
    if (!state.q) return; // Only open from results when a query is present
    const items = filtered();
    const item = items[state.activeIndex];
    if (item) openById(item.id);
  }
  
  // --- Events ---
  const onReady = () => {
    // nothing extra here—kept for clarity
  };
  
  document.addEventListener('DOMContentLoaded', onReady);
  
  // --- Live events ---
  //const elBtnClearSearch = document.getElementById('btnClearSearch'); // re-get after DOMContentLoaded if needed
  
  // Search input
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'search') {
      state.q = e.target.value.trim();
      state.activeIndex = 0;
      renderResults();
    }
  });
  
  // Click result
  document.addEventListener('click', (e) => {
    const row = e.target.closest('.note-row');
    if (row) openById(row.dataset.id);
  });
  
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      state.q = '';
      const s = document.getElementById('search');
      if (s) s.value = '';
  
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('bg-indigo-50', b === btn));
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('border-indigo-300', b === btn));
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('text-indigo-700', b === btn));
  
      state.activeIndex = 0;
      renderResults(state.filter !== 'all');
    });
  });
  
  // Clear search
  if (elBtnClearSearch) {
    elBtnClearSearch.addEventListener('click', () => {
      state.q = '';
      state.activeIndex = 0;
      const s = document.getElementById('search');
      if (s) { s.value = ''; s.focus(); }
      renderResults();
    });
  }
  
// More menu (⋯)
if (btnMore && moreMenu) {
  btnMore.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !moreMenu.classList.contains('hidden');
    moreMenu.classList.toggle('hidden');
    btnMore.setAttribute('aria-expanded', String(!isOpen));
  });
  document.addEventListener('click', () => {
    if (!moreMenu.classList.contains('hidden')) {
      moreMenu.classList.add('hidden');
      btnMore.setAttribute('aria-expanded', 'false');
    }
  });
}
  
  // Print
  const elBtnPrint = document.getElementById('btnPrint');
  if (elBtnPrint) {
    elBtnPrint.addEventListener('click', () => window.print());
  }
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    const elSearch = document.getElementById('search');
    const cmdK = (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey));
    if (cmdK) { e.preventDefault(); elSearch?.focus(); elSearch?.select(); return; }
    if (document.activeElement === elSearch) {
      if (e.key === 'Escape') { elSearch.value=''; state.q=''; renderResults(); elSearch.blur(); }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && state.q) {
        e.preventDefault();
        const items = filtered();
        if (items.length) {
          if (e.key === 'ArrowDown') state.activeIndex = Math.min(items.length - 1, state.activeIndex + 1);
          if (e.key === 'ArrowUp')   state.activeIndex = Math.max(0, state.activeIndex - 1);
          renderResults();
          const activeEl = document.querySelector(`#resultList [data-index=\"${state.activeIndex}\"]`);
          activeEl?.scrollIntoView({ block: 'nearest' });
        }
        return;
      }
      if (e.key === 'Enter') { e.preventDefault(); openActive(); }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (moreMenu && !moreMenu.classList.contains('hidden')) {
        moreMenu.classList.add('hidden');
        btnMore?.setAttribute('aria-expanded', 'false');
        return;
      }
      if (elSearch) { elSearch.value = ''; }
      state.q = '';
      state.activeIndex = 0;
      renderResults();
      return;
    }
    const items = filtered();
    if (e.key === 'ArrowDown') { e.preventDefault(); state.activeIndex = Math.min(items.length-1, state.activeIndex+1); renderResults(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); state.activeIndex = Math.max(0, state.activeIndex-1); renderResults(); }
    if (e.key === 'Enter') { e.preventDefault(); openActive(); }
  });
  
  // Deep link
  window.addEventListener('hashchange', () => {
    const id = location.hash.replace('#','');
    if (id) openById(id);
  });
  
  // Export
  document.getElementById('btnExport')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state.notes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'st-wiki-notes.json'; a.click();
    URL.revokeObjectURL(url);
  });
  
  // Import
  document.getElementById('fileImport')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('Expected an array of notes');
        state.notes = data;
        saveNotes();
        renderQuick();
        renderResults();
        if (state.notes[0]) openById(state.notes[0].id);
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
  });
  
  // Quick add note
  function kebab(s){return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');}
  function quickAddNote(){
    const title = prompt('Title for the new note?'); if(!title) return;
    const type = prompt('Type (session, npc, location, rule, faction)?','session') || 'session';
    const tags = (prompt('Tags (comma separated)?','')||'').split(',').map(t=>t.trim()).filter(Boolean);
    const id = kebab(`${type}-${title}`);
    const body = `# ${title}\n\nWrite your content here...`;
    const note = { id, title, type, tags, body };
    state.notes.unshift(note);
    saveNotes();
    renderQuick();
    renderResults();
    openById(id);
  }
  
  // New note button
  document.getElementById('btnNew')?.addEventListener('click', quickAddNote);
  
// Init
(async function initFromFile(){
  await fetchNotes();
  renderQuick();
  const forceShow = state.filter !== 'all' && !state.q;
  renderResults(forceShow);
  const startId = location.hash.replace('#','');
  if (startId) openById(startId); else if (filtered()[0]) openById(filtered()[0].id);
})().then(() => {
  window.__APP_BOOTED__ = true;
  console.log('App booted');
}).catch(err => {
  console.error('Init failed:', err);
});