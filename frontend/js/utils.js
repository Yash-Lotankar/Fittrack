// ===== CONFIG =====
const API_BASE = 'http://localhost:5000/api';

// ===== API HELPER =====
const api = {
  async request(method, endpoint, data = null) {
    const token = localStorage.getItem('fittrack_token');
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (data) opts.body = JSON.stringify(data);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, opts);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Request failed');
      return json;
    } catch (err) {
      throw err;
    }
  },
  get: (ep) => api.request('GET', ep),
  post: (ep, data) => api.request('POST', ep, data),
  put: (ep, data) => api.request('PUT', ep, data),
  delete: (ep) => api.request('DELETE', ep),
};

// ===== AUTH =====
const Auth = {
  getToken: () => localStorage.getItem('fittrack_token'),
  getUser: () => JSON.parse(localStorage.getItem('fittrack_user') || 'null'),
  setAuth: (token, user) => {
    localStorage.setItem('fittrack_token', token);
    localStorage.setItem('fittrack_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('fittrack_token');
    localStorage.removeItem('fittrack_user');
  },
  isLoggedIn: () => !!localStorage.getItem('fittrack_token'),
  isAdmin: () => {
    const user = Auth.getUser();
    return user && user.isAdmin;
  }
};

// ===== ROUTER =====
const Router = {
  navigate(page) {
    if (!Auth.isLoggedIn() && page !== 'login' && page !== 'register') {
      App.showPage('login'); return;
    }
    App.showPage(page);
  }
};

// ===== TOAST NOTIFICATIONS =====
const Toast = {
  show(msg, type = 'success', duration = 4000) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <span class="toast-msg">${msg}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// ===== THEME =====
const Theme = {
  init() {
    const saved = localStorage.getItem('fittrack_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    this.updateIcon(saved);
  },
  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('fittrack_theme', next);
    this.updateIcon(next);
  },
  updateIcon(theme) {
    document.querySelectorAll('.theme-toggle-icon').forEach(el => {
      el.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
  }
};

// ===== DATE UTILS =====
const DateUtils = {
  today: () => new Date().toISOString().split('T')[0],
  format(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },
  formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  },
  getLast7Days() {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
  },
  getDayLabel(dateStr) {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return days[new Date(dateStr).getDay()];
  }
};

// ===== VALIDATORS =====
const Validate = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  required: (v) => v !== null && v !== undefined && String(v).trim() !== '',
  min: (v, n) => parseFloat(v) >= n,
  max: (v, n) => parseFloat(v) <= n,
  showError(inputEl, msg) {
    const errEl = inputEl.parentElement.querySelector('.form-error') ||
                  inputEl.closest('.form-group')?.querySelector('.form-error');
    if (errEl) { errEl.textContent = msg; errEl.classList.add('show'); }
    inputEl.style.borderColor = 'var(--accent)';
  },
  clearError(inputEl) {
    const errEl = inputEl.parentElement.querySelector('.form-error') ||
                  inputEl.closest('.form-group')?.querySelector('.form-error');
    if (errEl) errEl.classList.remove('show');
    inputEl.style.borderColor = '';
  },
  clearAll(formEl) {
    formEl.querySelectorAll('.form-error').forEach(e => e.classList.remove('show'));
    formEl.querySelectorAll('input,select').forEach(e => e.style.borderColor = '');
  }
};

// ===== NUMBER UTILS =====
const Num = {
  fmt: (n) => isNaN(n) ? '0' : Math.round(n).toLocaleString(),
  fmtDec: (n, d = 1) => isNaN(n) ? '0' : parseFloat(n).toFixed(d),
};

// ===== WORKOUT CATEGORY ICONS =====
const CAT_ICONS = {
  cardio: '🏃', strength: '🏋️', yoga: '🧘', hiit: '⚡', sports: '⚽', flexibility: '🤸', other: '💪'
};

// ===== CALORIE SUGGESTIONS =====
function calcSuggestedCalories(user) {
  if (!user) return 2000;
  return user.dailyCalorieGoal || user.tdee || 2000;
}

// ===== BMI UTILS =====
function getBMIClass(bmi) {
  if (!bmi) return '';
  bmi = parseFloat(bmi);
  if (bmi < 18.5) return 'bmi-underweight';
  if (bmi < 25) return 'bmi-normal';
  if (bmi < 30) return 'bmi-overweight';
  return 'bmi-obese';
}
function getBMICategory(bmi) {
  if (!bmi) return 'N/A';
  bmi = parseFloat(bmi);
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

// ===== EXPORT CSV =====
function exportCSV(data, filename, headers, rowFn) {
  const rows = [headers.join(',')];
  data.forEach(item => rows.push(rowFn(item).map(v => `"${v}"`).join(',')));
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  Toast.show(`Exported ${data.length} records`, 'success');
}

// ===== DOM UTILS =====
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) { btn._origText = btn.innerHTML; btn.innerHTML = '<span class="spinner">⟳</span> Loading...'; btn.disabled = true; }
  else { btn.innerHTML = btn._origText || btn.innerHTML; btn.disabled = false; }
}
