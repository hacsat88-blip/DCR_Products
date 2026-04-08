const state = {
  stocks: structuredClone(window.APP_DATA.stocks),
  filteredStocks: [],
  activeKey: window.APP_DATA.stocks[0].key,
  notes: JSON.parse(localStorage.getItem('stock-notes') || '{}'),
  watch: JSON.parse(localStorage.getItem('stock-watch') || '{}')
};

const els = {
  metricGrid: document.getElementById('metricGrid'),
  roadmapList: document.getElementById('roadmapList'),
  rankingBody: document.getElementById('rankingBody'),
  stockGrid: document.getElementById('stockGrid'),
  proseSummary: document.getElementById('proseSummary'),
  resultCount: document.getElementById('resultCount'),
  searchInput: document.getElementById('searchInput'),
  minPriceInput: document.getElementById('minPriceInput'),
  maxPriceInput: document.getElementById('maxPriceInput'),
  sectorSelect: document.getElementById('sectorSelect'),
  actionSelect: document.getElementById('actionSelect'),
  watchSelect: document.getElementById('watchSelect'),
  sortSelect: document.getElementById('sortSelect'),
  resetButton: document.getElementById('resetButton'),
  detailName: document.getElementById('detailName'),
  detailSubtitle: document.getElementById('detailSubtitle'),
  detailBadge: document.getElementById('detailBadge'),
  detailBlurb: document.getElementById('detailBlurb'),
  detailThesis: document.getElementById('detailThesis'),
  detailKpi: document.getElementById('detailKpi'),
  detailRisks: document.getElementById('detailRisks'),
  detailMitigation: document.getElementById('detailMitigation'),
  chipRow: document.getElementById('chipRow'),
  detailNote: document.getElementById('detailNote'),
  saveNoteButton: document.getElementById('saveNoteButton'),
  saveState: document.getElementById('saveState'),
  toggleWatchButton: document.getElementById('toggleWatchButton')
};

function hydrateStocks() {
  state.stocks = state.stocks.map(stock => ({
    ...stock,
    watching: state.watch[stock.key] ?? stock.watching
  }));
}

function populateSelects() {
  const sectors = ['all', ...new Set(state.stocks.map(s => s.sector))];
  els.sectorSelect.innerHTML = sectors.map(s => `<option value="${s}">${s === 'all' ? 'すべて' : s}</option>`).join('');

  const actions = ['all', ...new Set(state.stocks.map(s => s.action))];
  els.actionSelect.innerHTML = actions.map(a => `<option value="${a}">${a === 'all' ? 'すべて' : a}</option>`).join('');
}

function scoreClass(score) {
  if (score >= 80) return 'good';
  if (score >= 70) return 'mid';
  return 'low';
}

function pathFromSeries(data, width, height, padding) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const xStep = (width - padding.left - padding.right) / (data.length - 1);
  return data.map((v, i) => {
    const x = padding.left + i * xStep;
    const y = padding.top + (max - v) / (max - min || 1) * (height - padding.top - padding.bottom);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

function renderMainChart() {
  const svg = document.getElementById('benchmarkChart');
  const width = 1200, height = 520;
  const padding = { top: 26, right: 24, bottom: 28, left: 28 };
  const gridYs = [120, 230, 340, 450];

  const managerPath = pathFromSeries(window.APP_DATA.benchmarkSeries.manager, width, height, padding);
  const nikkeiPath = pathFromSeries(window.APP_DATA.benchmarkSeries.nikkei, width, height, padding);

  svg.innerHTML = `
    <defs>
      <filter id="glowMint"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="glowBlue"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    ${gridYs.map(y => `<line class="gridline" x1="28" y1="${y}" x2="1176" y2="${y}" />`).join('')}
    <path d="${nikkeiPath}" fill="none" stroke="#8bb0ff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" filter="url(#glowBlue)" />
    <path d="${managerPath}" fill="none" stroke="#5bf0ba" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" filter="url(#glowMint)" />
  `;
}

function renderMetrics() {
  const watchingCount = state.stocks.filter(s => s.watching).length;
  els.metricGrid.innerHTML = `
    <div class="card">
      <div class="metric-label">Manager Index（100基準）</div>
      <div class="metric-value">182.4</div>
      <div class="metric-sub">設定来 <span class="accent">+82.4%</span></div>
    </div>
    <div class="card">
      <div class="metric-label">Benchmark（日経平均, 100基準）</div>
      <div class="metric-value">151.1</div>
      <div class="metric-sub">設定来 <span class="accent-blue">+51.1%</span></div>
    </div>
    <div class="card">
      <div class="metric-label">設定来超過収益</div>
      <div class="metric-value">+31.3%</div>
      <div class="metric-sub">Manager Index - Benchmark</div>
    </div>
    <div class="card">
      <div class="metric-label">監視銘柄数</div>
      <div class="metric-value">${watchingCount}</div>
      <div class="metric-sub">最新更新 <span class="muted">Step 1 prototype</span></div>
    </div>`;
}

function renderRoadmap() {
  els.roadmapList.innerHTML = window.APP_DATA.roadmap.map(item => `
    <div class="decision-item">
      <div>
        <strong>${item.title}</strong>
        <small>${item.body}</small>
      </div>
      <span class="badge ${item.badgeClass}">${item.badge}</span>
    </div>`).join('');
}

function buildSummary(list) {
  if (!list.length) {
    return '条件に合う銘柄がありません。いまは網が細かすぎる状態です。価格帯か業態かアクションのどれかを少し緩めると、水面に魚影が戻ります。';
  }
  const buy = list.filter(s => s.action === '今買う').map(s => s.name);
  const wait = list.filter(s => s.action === '決算待ち').map(s => s.name);
  const dip = list.filter(s => s.action === '押し目待ち').map(s => s.name);
  return `いま画面に残っているのは ${list.length} 銘柄です。${buy.length ? `今買う枠は ${buy.join('、')}。` : ''}${wait.length ? `決算待ちには ${wait.join('、')} がいて、数字の芯をもう一度確かめる局面です。` : ''}${dip.length ? `押し目待ちの ${dip.join('、')} は、会社より値段の熱を見ています。` : ''} つまり、安い株を探しているのではなく、壊れにくい成長の姿勢を探している画面です。`;
}

function applyFilters() {
  const q = els.searchInput.value.trim().toLowerCase();
  const minPrice = Number(els.minPriceInput.value || 0);
  const maxPrice = Number(els.maxPriceInput.value || Number.POSITIVE_INFINITY);
  const sector = els.sectorSelect.value;
  const action = els.actionSelect.value;
  const watch = els.watchSelect.value;
  const sort = els.sortSelect.value;

  let list = state.stocks.filter(stock => {
    const matchesQuery = !q || [stock.name, stock.code, stock.searchTags, stock.blurb, stock.category].join(' ').toLowerCase().includes(q);
    const matchesPrice = stock.price >= minPrice && stock.price <= maxPrice;
    const matchesSector = sector === 'all' || stock.sector === sector;
    const matchesAction = action === 'all' || stock.action === action;
    const matchesWatch = watch === 'all' || (watch === 'watching' ? stock.watching : !stock.watching);
    return matchesQuery && matchesPrice && matchesSector && matchesAction && matchesWatch;
  });

  if (sort === 'score-desc') list.sort((a,b) => b.score - a.score);
  if (sort === 'price-asc') list.sort((a,b) => a.price - b.price);
  if (sort === 'price-desc') list.sort((a,b) => b.price - a.price);
  if (sort === 'name-asc') list.sort((a,b) => a.name.localeCompare(b.name, 'ja'));

  state.filteredStocks = list;
  if (!list.some(s => s.key === state.activeKey)) state.activeKey = list[0]?.key || null;
  renderAll();
}

function renderRanking() {
  if (!state.filteredStocks.length) {
    els.rankingBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">該当銘柄がありません。条件を少し緩めてください。</div></td></tr>`;
    return;
  }
  els.rankingBody.innerHTML = state.filteredStocks.map(stock => `
    <tr>
      <td><strong>${stock.name}</strong><br><span class="muted">${stock.code}</span></td>
      <td>${stock.sector}</td>
      <td>${stock.blurb}</td>
      <td><span class="badge ${stock.statusClass}">${stock.action}</span></td>
      <td><span class="score ${scoreClass(stock.score)}">${stock.score}</span></td>
      <td>${stock.watching ? '監視中' : '未監視'}</td>
    </tr>`).join('');
}

function renderCards() {
  if (!state.filteredStocks.length) {
    els.stockGrid.innerHTML = `<div class="empty-state">絞り込み条件に合う銘柄がありません。</div>`;
    return;
  }
  els.stockGrid.innerHTML = state.filteredStocks.map(stock => `
    <article class="card stock-card ${stock.key === state.activeKey ? 'active' : ''}" data-key="${stock.key}">
      <div class="stock-head">
        <div>
          <div class="stock-code">${stock.code}</div>
          <h3 class="stock-name">${stock.name}</h3>
        </div>
        <span class="badge ${stock.statusClass}">${stock.action}</span>
      </div>
      <div class="price">¥${stock.price.toLocaleString()}</div>
      <div class="subline">${stock.actionReason}</div>
      <div class="sector-chip">${stock.sector}</div>
      ${stock.watching ? '<div class="watch-chip">監視中</div>' : ''}
      <div class="kpi">
        <div class="kpi-box"><span>${stock.coreKpiLabel}</span><strong>${stock.coreKpiValue}</strong></div>
        <div class="kpi-box"><span>${stock.growthLabel}</span><strong>${stock.growthValue}</strong></div>
      </div>
      <div class="thesis">${stock.thesis}</div>
    </article>`).join('');

  document.querySelectorAll('.stock-card').forEach(card => {
    card.addEventListener('click', () => {
      state.activeKey = card.dataset.key;
      renderAll();
      document.querySelector('.detail-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderMiniChart(series, color) {
  const svg = document.getElementById('miniChart');
  const width = 420, height = 240;
  const padding = { top: 18, right: 12, bottom: 20, left: 12 };
  const path = pathFromSeries(series, width, height, padding);
  svg.innerHTML = `
    <defs>
      <filter id="glowMini"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <line class="gridline" x1="12" y1="55" x2="408" y2="55"></line>
    <line class="gridline" x1="12" y1="118" x2="408" y2="118"></line>
    <line class="gridline" x1="12" y1="181" x2="408" y2="181"></line>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#glowMini)" />
  `;
}

function renderDetail() {
  const stock = state.stocks.find(s => s.key === state.activeKey) || state.filteredStocks[0] || state.stocks[0];
  if (!stock) return;
  els.detailName.textContent = `${stock.name} (${stock.code})`;
  els.detailSubtitle.textContent = stock.subtitle;
  els.detailBadge.textContent = stock.statusText;
  els.detailBadge.className = `badge ${stock.statusClass}`;
  els.detailBlurb.textContent = stock.blurb;
  els.detailThesis.textContent = stock.thesis;
  els.detailKpi.textContent = stock.kpiText;
  els.detailRisks.innerHTML = stock.risks.map(item => `<li>${item}</li>`).join('');
  els.detailMitigation.innerHTML = stock.mitigation.map(item => `<li>${item}</li>`).join('');
  els.chipRow.innerHTML = stock.chips.map(chip => `<span class="chip">${chip}</span>`).join('');
  els.detailNote.value = state.notes[stock.key] || '';
  els.toggleWatchButton.textContent = stock.watching ? '監視から外す' : '監視に追加';
  els.saveState.textContent = '';
  renderMiniChart(stock.miniSeries, stock.statusClass === 'b-buy' ? '#5bf0ba' : '#8bb0ff');
}

function renderAll() {
  renderMetrics();
  renderRanking();
  renderCards();
  renderDetail();
  els.resultCount.textContent = String(state.filteredStocks.length);
  els.proseSummary.textContent = buildSummary(state.filteredStocks);
}

function toggleWatch() {
  const stock = state.stocks.find(s => s.key === state.activeKey);
  if (!stock) return;
  stock.watching = !stock.watching;
  state.watch[stock.key] = stock.watching;
  localStorage.setItem('stock-watch', JSON.stringify(state.watch));
  applyFilters();
}

function saveNote() {
  const stock = state.stocks.find(s => s.key === state.activeKey);
  if (!stock) return;
  state.notes[stock.key] = els.detailNote.value;
  localStorage.setItem('stock-notes', JSON.stringify(state.notes));
  els.saveState.textContent = '保存しました';
  setTimeout(() => { els.saveState.textContent = ''; }, 1500);
}

function bindEvents() {
  [els.searchInput, els.minPriceInput, els.maxPriceInput, els.sectorSelect, els.actionSelect, els.watchSelect, els.sortSelect]
    .forEach(el => el.addEventListener('input', applyFilters));
  [els.sectorSelect, els.actionSelect, els.watchSelect, els.sortSelect]
    .forEach(el => el.addEventListener('change', applyFilters));

  els.resetButton.addEventListener('click', () => {
    els.searchInput.value = '';
    els.minPriceInput.value = '';
    els.maxPriceInput.value = '';
    els.sectorSelect.value = 'all';
    els.actionSelect.value = 'all';
    els.watchSelect.value = 'all';
    els.sortSelect.value = 'score-desc';
    applyFilters();
  });
  els.saveNoteButton.addEventListener('click', saveNote);
  els.toggleWatchButton.addEventListener('click', toggleWatch);
}

hydrateStocks();
populateSelects();
renderMainChart();
renderRoadmap();
bindEvents();
state.filteredStocks = [...state.stocks].sort((a, b) => b.score - a.score);
renderAll();
