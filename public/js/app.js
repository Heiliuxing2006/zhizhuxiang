/* ============================
   智猪乡盟 · 收录小程序 JS
   ============================ */

const API = '';  // 空 = 同域

// ── 页面切换 ──
function switchPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tabbar-item').forEach(t => t.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');
  const tab = document.querySelector(`.tabbar-item[data-page="${pageId}"]`);
  if (tab) tab.classList.add('active');
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

// ── 提交表单 ──
document.addEventListener('DOMContentLoaded', () => {
  // 面积验证
  const areaInput = document.getElementById('area');
  const areaDisplay = document.getElementById('area-display');
  if (areaInput && areaDisplay) {
    areaInput.addEventListener('input', () => {
      const v = areaInput.value;
      if (v) {
        areaDisplay.textContent = v + ' 亩' + (v < 15 || v > 20 ? ' ⚠️ 建议 15-20 亩' : ' ✅');
        areaDisplay.style.color = (v >= 15 && v <= 20) ? 'var(--green-mid)' : '#E86C00';
      } else {
        areaDisplay.textContent = '请输入面积';
        areaDisplay.style.color = 'var(--text-gray)';
      }
    });
  }

  // 照片上传预览
  const photoInput = document.getElementById('photos');
  const preview = document.getElementById('photo-preview');
  if (photoInput && preview) {
    photoInput.addEventListener('change', () => {
      preview.innerHTML = '';
      const files = Array.from(photoInput.files).slice(0, 5);
      files.forEach(f => {
        const reader = new FileReader();
        reader.onload = e => {
          const img = document.createElement('img');
          img.src = e.target.result;
          preview.appendChild(img);
        };
        reader.readAsDataURL(f);
      });
    });
  }

  // 表单提交
  const form = document.getElementById('submit-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('.btn');
      btn.disabled = true;
      btn.textContent = '提交中...';

      // 清除错误
      document.querySelectorAll('.form-group.error').forEach(el => el.classList.remove('error'));

      let hasError = false;

      // 验证必填
      const name = document.getElementById('name');
      const phone = document.getElementById('phone');
      const province = document.getElementById('province');
      const county = document.getElementById('county');
      const area = document.getElementById('area');

      if (!name.value.trim()) { name.closest('.form-group').classList.add('error'); hasError = true; }
      if (!phone.value.trim()) { phone.closest('.form-group').classList.add('error'); hasError = true; }
      if (!province.value.trim()) { province.closest('.form-group').classList.add('error'); hasError = true; }
      if (!county.value.trim()) { county.closest('.form-group').classList.add('error'); hasError = true; }

      if (!area.value || parseFloat(area.value) < 15 || parseFloat(area.value) > 20) {
        area.closest('.form-group').classList.add('error');
        showToast('养殖场面积需在 15-20 亩之间', true);
        hasError = true;
      }

      if (hasError) {
        btn.disabled = false;
        btn.textContent = '提交收录';
        return;
      }

      try {
        const fd = new FormData(form);
        const res = await fetch(API + '/api/submit', { method: 'POST', body: fd });
        const data = await res.json();

        if (data.success) {
          document.getElementById('modal-submit').classList.add('show');
          form.reset();
          if (preview) preview.innerHTML = '';
          if (areaDisplay) { areaDisplay.textContent = '请输入面积'; areaDisplay.style.color = 'var(--text-gray)'; }
          loadStats();
        } else {
          showToast(data.message || '提交失败', true);
        }
      } catch (err) {
        showToast('网络错误，请稍后再试', true);
      } finally {
        btn.disabled = false;
        btn.textContent = '提交收录';
      }
    });
  }

  // 弹窗关闭
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) m.classList.remove('show');
    });
  });

  // 初始加载
  switchPage('home');
});
