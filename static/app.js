// ============================================================
// Learning Dashboard - Frontend Logic
// ============================================================

// ---------- State ----------
let authMode = 'login';
let currentStudySessionId = null;

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  setupAuthUI();
  setupTabs();
  setupSettings();
  checkAuth();
});

// ============================================================
// Auth UI
// ============================================================
function setupAuthUI() {
  const form = document.getElementById('auth-form');
  const switchLink = document.getElementById('auth-switch-link');
  const switchText = document.getElementById('auth-switch-text');
  const subtitle = document.getElementById('auth-subtitle');
  const submitBtn = document.getElementById('auth-submit-btn');
  const password2Group = document.getElementById('auth-password2-group');
  const password2Input = document.getElementById('auth-password2');

  switchLink.addEventListener('click', (e) => {
    e.preventDefault();
    authMode = authMode === 'login' ? 'register' : 'login';
    if (authMode === 'register') {
      subtitle.textContent = '创建新账户';
      submitBtn.textContent = '注册';
      switchText.textContent = '已有账号？';
      switchLink.textContent = '立即登录';
      password2Group.classList.remove('hidden');
      password2Input.required = true;
    } else {
      subtitle.textContent = '登录你的账户';
      submitBtn.textContent = '登录';
      switchText.textContent = '还没有账号？';
      switchLink.textContent = '立即注册';
      password2Group.classList.add('hidden');
      password2Input.required = false;
    }
    hideAuthError();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleAuthSubmit();
  });
}

function checkAuth() {
  fetch('/api/auth/me')
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        showDashboard(data.email);
      } else {
        showAuthOverlay();
      }
    })
    .catch(() => showAuthOverlay());
}

function handleAuthSubmit() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const password2 = document.getElementById('auth-password2').value;

  if (!email || !password) {
    showAuthError('邮箱和密码不能为空');
    return;
  }

  if (authMode === 'register') {
    if (password !== password2) {
      showAuthError('两次密码输入不一致');
      return;
    }
    if (password.length < 6) {
      showAuthError('密码长度至少6位');
      return;
    }
  }

  const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
  const body = authMode === 'register'
    ? { email, password, password2 }
    : { email, password };

  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        showDashboard(email);
        showToast(data.message || '成功');
      } else {
        showAuthError(data.message || '操作失败');
      }
    })
    .catch(() => showAuthError('网络错误，请重试'));
}

function logout() {
  fetch('/api/auth/logout', { method: 'POST' })
    .then(() => {
      document.getElementById('dashboard').classList.add('hidden');
      document.getElementById('auth-overlay').classList.remove('hidden');
      document.getElementById('auth-form').reset();
      hideAuthError();
    });
}

function showDashboard(email) {
  document.getElementById('auth-overlay').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('user-email').textContent = email;
  loadStudyStats();
  loadStudySessions();
  loadFinance();
  loadFinanceSummary();
  loadSkills();
  loadProducts();
  document.getElementById('fin-date').valueAsDate = new Date();
}

function showAuthOverlay() {
  document.getElementById('auth-overlay').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideAuthError() {
  document.getElementById('auth-error').classList.add('hidden');
}

// ============================================================
// Toast
// ============================================================
function showToast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('error');
  if (isError) el.classList.add('error');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ============================================================
// Tabs
// ============================================================
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + target).classList.add('active');
    });
  });
}

// ============================================================
// Study
// ============================================================
function startStudy() {
  const btnStart = document.getElementById('btn-start');
  const btnEnd = document.getElementById('btn-end');
  btnStart.disabled = true;
  btnEnd.disabled = false;

  fetch('/api/study/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        currentStudySessionId = data.session_id;
        showToast('学习计时开始');
      } else {
        btnStart.disabled = false;
        btnEnd.disabled = true;
        showToast(data.message || '开始失败', true);
      }
    })
    .catch(() => {
      btnStart.disabled = false;
      btnEnd.disabled = true;
      showToast('网络错误', true);
    });
}

function endStudy() {
  if (!currentStudySessionId) return;
  const btnStart = document.getElementById('btn-start');
  const btnEnd = document.getElementById('btn-end');

  fetch('/api/study/end', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: currentStudySessionId })
  })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        currentStudySessionId = null;
        btnStart.disabled = false;
        btnEnd.disabled = true;
        showToast('学习计时结束');
        loadStudyStats();
        loadStudySessions();
      } else {
        showToast(data.message || '结束失败', true);
      }
    })
    .catch(() => showToast('网络错误', true));
}

function loadStudyStats() {
  fetch('/api/study/stats')
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        document.getElementById('stat-today').textContent = formatMinutes(data.today_minutes);
        document.getElementById('stat-month').textContent = formatMinutes(data.month_minutes);
        document.getElementById('stat-total').textContent = formatMinutes(data.total_minutes);
      }
    });
}

function loadStudySessions() {
  fetch('/api/study/sessions')
    .then(r => r.json())
    .then(data => {
      const container = document.getElementById('study-list');
      if (!data.ok || !data.sessions.length) {
        container.innerHTML = '<div class="list-empty">暂无学习记录</div>';
        return;
      }
      container.innerHTML = data.sessions.map(s => {
        const start = new Date(s.start_time + 'Z').toLocaleString('zh-CN');
        return '<div class="list-item">' +
          '<div class="item-body">' +
          '<div class="item-title">' + formatMinutes(s.duration_minutes) + '</div>' +
          '<div class="item-meta">' + start + '</div>' +
          '</div>' +
          '</div>';
      }).join('');
    });
}

function formatMinutes(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h + '小时' + m + '分钟';
}

// ============================================================
// Finance
// ============================================================
function loadFinance() {
  fetch('/api/finance')
    .then(r => r.json())
    .then(data => {
      const container = document.getElementById('finance-list');
      if (!data.ok || !data.records.length) {
        container.innerHTML = '<div class="list-empty">暂无资金记录</div>';
        return;
      }
      container.innerHTML = data.records.map(r => {
        const cls = r.type === 'income' ? 'income' : 'expense';
        const prefix = r.type === 'income' ? '+' : '-';
        const date = new Date(r.date + 'T00:00:00').toLocaleDateString('zh-CN');
        return '<div class="list-item">' +
          '<div class="item-body">' +
          '<div class="item-title">' + escHtml(r.category || '未分类') + '</div>' +
          '<div class="item-meta">' + date + ' ' + escHtml(r.note || '') + '</div>' +
          '</div>' +
          '<div class="item-amount ' + cls + '">' + prefix + '¥' + r.amount.toFixed(2) + '</div>' +
          '<div class="item-actions">' +
          '<button class="danger" onclick="deleteFinance(' + r.id + ')">删除</button>' +
          '</div>' +
          '</div>';
      }).join('');
    });
}

function loadFinanceSummary() {
  fetch('/api/finance/summary')
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        document.getElementById('fin-balance').textContent = '¥' + data.total_balance.toFixed(2);
        document.getElementById('fin-income').textContent = '¥' + data.month_income.toFixed(2);
        document.getElementById('fin-expense').textContent = '¥' + data.month_expense.toFixed(2);
      }
    });
}

function addFinance(e) {
  e.preventDefault();
  const date = document.getElementById('fin-date').value;
  const type = document.getElementById('fin-type').value;
  const amount = parseFloat(document.getElementById('fin-amount').value);
  const category = document.getElementById('fin-category').value.trim();
  const note = document.getElementById('fin-note').value.trim();

  if (!date || !amount || amount <= 0) {
    showToast('请填写日期和有效金额', true);
    return false;
  }

  fetch('/api/finance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, type, amount, category, note })
  })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        showToast('已添加');
        document.getElementById('fin-amount').value = '';
        document.getElementById('fin-category').value = '';
        document.getElementById('fin-note').value = '';
        loadFinance();
        loadFinanceSummary();
      } else {
        showToast(data.message || '添加失败', true);
      }
    });
  return false;
}

function deleteFinance(id) {
  if (!confirm('确认删除？')) return;
  fetch('/api/finance/' + id, { method: 'DELETE' })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        showToast('已删除');
        loadFinance();
        loadFinanceSummary();
      } else {
        showToast('删除失败', true);
      }
    });
}

// ============================================================
// Skills
// ============================================================
function loadSkills() {
  fetch('/api/skills')
    .then(r => r.json())
    .then(data => {
      const container = document.getElementById('skill-list');
      if (!data.ok || !data.skills.length) {
        container.innerHTML = '<div class="list-empty">暂无技能记录</div>';
        return;
      }
      container.innerHTML = data.skills.map(s => {
        const badgeMap = { '了解': 'beginner', '熟悉': 'familiar', '掌握': 'mastery', '精通': 'expert' };
        const badgeCls = badgeMap[s.proficiency] || 'beginner';
        return '<div class="list-item">' +
          '<div class="item-body">' +
          '<div class="item-title">' + escHtml(s.name) + ' <span class="badge badge-' + badgeCls + '">' + escHtml(s.proficiency) + '</span></div>' +
          '<div class="item-meta">' + s.hours + ' 小时 ' + (s.link ? '<a href="' + escHtml(s.link) + '" target="_blank">链接</a> ' : '') + escHtml(s.note) + '</div>' +
          '</div>' +
          '<div class="item-actions">' +
          '<button onclick="editSkill(' + s.id + ', \'' + escAttr(s.name) + '\', ' + s.hours + ', \'' + escAttr(s.proficiency) + '\', \'' + escAttr(s.link) + '\', \'' + escAttr(s.note) + '\')">编辑</button>' +
          '<button class="danger" onclick="deleteSkill(' + s.id + ')">删除</button>' +
          '</div>' +
          '</div>';
      }).join('');
    });
}

function saveSkill(e) {
  e.preventDefault();
  const editId = document.getElementById('skill-edit-id').value;
  const name = document.getElementById('skill-name').value.trim();
  const hours = parseFloat(document.getElementById('skill-hours').value);
  const proficiency = document.getElementById('skill-proficiency').value;
  const link = document.getElementById('skill-link').value.trim();
  const note = document.getElementById('skill-note').value.trim();

  if (!name || !hours || hours <= 0) {
    showToast('请填写技能名称和有效时长', true);
    return false;
  }

  const isEdit = !!editId;
  const url = isEdit ? '/api/skills/' + editId : '/api/skills';
  const method = isEdit ? 'PUT' : 'POST';

  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, hours, proficiency, link, note })
  })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        showToast(isEdit ? '已更新' : '已添加');
        cancelSkillEdit();
        loadSkills();
      } else {
        showToast(data.message || '保存失败', true);
      }
    });
  return false;
}

function editSkill(id, name, hours, proficiency, link, note) {
  document.getElementById('skill-edit-id').value = id;
  document.getElementById('skill-name').value = name;
  document.getElementById('skill-hours').value = hours;
  document.getElementById('skill-proficiency').value = proficiency;
  document.getElementById('skill-link').value = link;
  document.getElementById('skill-note').value = note;
  document.getElementById('skill-submit-btn').textContent = '更新';
  document.getElementById('skill-form-title').textContent = '编辑技能';
  document.getElementById('skill-cancel-btn').classList.remove('hidden');
}

function cancelSkillEdit() {
  document.getElementById('skill-edit-id').value = '';
  document.getElementById('skill-form').reset();
  document.getElementById('skill-submit-btn').textContent = '添加';
  document.getElementById('skill-form-title').textContent = '添加技能';
  document.getElementById('skill-cancel-btn').classList.add('hidden');
}

function deleteSkill(id) {
  if (!confirm('确认删除？')) return;
  fetch('/api/skills/' + id, { method: 'DELETE' })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        showToast('已删除');
        loadSkills();
      } else {
        showToast('删除失败', true);
      }
    });
}

// ============================================================
// Products
// ============================================================
function loadProducts() {
  fetch('/api/products')
    .then(r => r.json())
    .then(data => {
      const container = document.getElementById('product-list');
      if (!data.ok || !data.products.length) {
        container.innerHTML = '<div class="list-empty">暂无产品记录</div>';
        return;
      }
      container.innerHTML = data.products.map(p => {
        const date = p.completed_date ? new Date(p.completed_date + 'T00:00:00').toLocaleDateString('zh-CN') : '';
        return '<div class="list-item">' +
          '<div class="item-body">' +
          '<div class="item-title">' + escHtml(p.name) + ' <span style="color:var(--text-muted);font-size:12px">[' + escHtml(p.type) + ']</span></div>' +
          '<div class="item-meta">' + date + ' ' + (p.link ? '<a href="' + escHtml(p.link) + '" target="_blank">链接</a> ' : '') + escHtml(p.description) + '</div>' +
          '</div>' +
          '<div class="item-actions">' +
          '<button onclick="editProduct(' + p.id + ', \'' + escAttr(p.name) + '\', \'' + escAttr(p.type) + '\', \'' + escAttr(p.completed_date) + '\', \'' + escAttr(p.link) + '\', \'' + escAttr(p.description) + '\')">编辑</button>' +
          '<button class="danger" onclick="deleteProduct(' + p.id + ')">删除</button>' +
          '</div>' +
          '</div>';
      }).join('');
    });
}

function saveProduct(e) {
  e.preventDefault();
  const editId = document.getElementById('product-edit-id').value;
  const name = document.getElementById('product-name').value.trim();
  const type = document.getElementById('product-type').value;
  const completed_date = document.getElementById('product-date').value;
  const link = document.getElementById('product-link').value.trim();
  const description = document.getElementById('product-desc').value.trim();

  if (!name) {
    showToast('请填写项目名称', true);
    return false;
  }

  const isEdit = !!editId;
  const url = isEdit ? '/api/products/' + editId : '/api/products';
  const method = isEdit ? 'PUT' : 'POST';

  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type, completed_date, link, description })
  })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        showToast(isEdit ? '已更新' : '已添加');
        cancelProductEdit();
        loadProducts();
      } else {
        showToast(data.message || '保存失败', true);
      }
    });
  return false;
}

function editProduct(id, name, type, completed_date, link, description) {
  document.getElementById('product-edit-id').value = id;
  document.getElementById('product-name').value = name;
  document.getElementById('product-type').value = type;
  document.getElementById('product-date').value = completed_date;
  document.getElementById('product-link').value = link;
  document.getElementById('product-desc').value = description;
  document.getElementById('product-submit-btn').textContent = '更新';
  document.getElementById('product-form-title').textContent = '编辑产品';
  document.getElementById('product-cancel-btn').classList.remove('hidden');
}

function cancelProductEdit() {
  document.getElementById('product-edit-id').value = '';
  document.getElementById('product-form').reset();
  document.getElementById('product-submit-btn').textContent = '添加';
  document.getElementById('product-form-title').textContent = '添加产品';
  document.getElementById('product-cancel-btn').classList.add('hidden');
}

function deleteProduct(id) {
  if (!confirm('确认删除？')) return;
  fetch('/api/products/' + id, { method: 'DELETE' })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        showToast('已删除');
        loadProducts();
      } else {
        showToast('删除失败', true);
      }
    });
}

// ============================================================
// Settings (Export / Import / Clear)
// ============================================================
function setupSettings() {
  const btn = document.getElementById('settings-btn');
  const menu = document.getElementById('settings-menu');
  btn.addEventListener('click', () => menu.classList.toggle('hidden'));
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });
}

function exportData() {
  document.getElementById('settings-menu').classList.add('hidden');
  fetch('/api/export')
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dashboard-export-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('数据已导出');
      }
    });
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      })
        .then(r => r.json())
        .then(res => {
          if (res.ok) {
            showToast('数据已导入');
            loadAll();
          } else {
            showToast(res.message || '导入失败', true);
          }
        });
    } catch (err) {
      showToast('无效的 JSON 文件', true);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function clearAllData() {
  document.getElementById('settings-menu').classList.add('hidden');
  if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) return;
  fetch('/api/clear', { method: 'POST' })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        showToast('数据已清空');
        loadAll();
      } else {
        showToast('清空失败', true);
      }
    });
}

function loadAll() {
  loadStudyStats();
  loadStudySessions();
  loadFinance();
  loadFinanceSummary();
  loadSkills();
  loadProducts();
}

// ============================================================
// Helpers
// ============================================================
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
