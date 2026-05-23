/* ============================
   智猪侠 · 收录小程序 JS
   ============================ */

const API = '';  // 空 = 同域

// ── 页面切换 ──
function switchPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tabbar-item').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.header-nav a').forEach(a => a.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');
  const tab = document.querySelector(`.tabbar-item[data-page="${pageId}"]`);
  if (tab) tab.classList.add('active');
  const navLink = document.querySelector(`.header-nav a[data-page="${pageId}"]`);
  if (navLink) navLink.classList.add('active');
  window.scrollTo(0, 0);
  // 加载数据
  if (pageId === 'list') loadList();
  if (pageId === 'home') loadStats();
}

// ── Toast ──
let toastTimer;
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  requestAnimationFrame(() => {
    t.classList.add('show');
    toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
  });
}

// ── 统计 ──
async function loadStats() {
  try {
    const res = await fetch(API + '/api/stats');
    const data = await res.json();
    if (data.success) {
      document.getElementById('stat-total').textContent = data.total;
      document.getElementById('stat-area').textContent = data.totalArea + '亩';
      document.getElementById('stat-prov').textContent = data.provinces + '省';
    }
  } catch (e) { /* silently fail */ }
}

// ── 列表 ──
async function loadList() {
  const container = document.getElementById('list-container');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>加载中...</div>';
  try {
    const res = await fetch(API + '/api/list');
    const data = await res.json();
    if (!data.success) { container.innerHTML = '<div class="list-empty">加载失败</div>'; return; }

    document.getElementById('list-count').textContent = `共 ${data.total} 条收录`;

    if (data.list.length === 0) {
      container.innerHTML = '<div class="list-empty"><div class="icon">🏘️</div>暂无收录记录<br>成为第一个提交的人！</div>';
      return;
    }

    const statusMap = { '闲置': '🏚️', '废弃': '🏚️', '运营中': '✅' };
    container.innerHTML = data.list.map(item => `
      <div class="list-item">
        <div class="loc">${item.province}${item.city}${item.county}${item.town ? ' · ' + item.town : ''}${item.village ? ' ' + item.village : ''}</div>
        <div class="meta">
          <span>📐 ${item.area}亩</span>
          <span>${statusMap[item.status] || '🏚️'} ${item.status}</span>
          <span>📅 ${item.createdAt}</span>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<div class="list-empty">网络错误，请稍后再试</div>';
  }
}
