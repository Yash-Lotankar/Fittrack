// ===== WATER PAGE =====
const WaterPage = {
  currentDate: DateUtils.today(),
  logs: [],

  async render() {
    const user = Auth.getUser();
    const goal = user?.dailyWaterGoal || 2.5;
    $('#page-content').innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Water Intake</h1><p class="page-subtitle">Stay hydrated every day</p></div>
        <input type="date" id="water-date" class="form-input" value="${this.currentDate}" style="max-width:180px" onchange="WaterPage.changeDate()">
      </div>
      <div style="display:grid;grid-template-columns:1fr 2fr;gap:18px">
        <div class="card">
          <div class="card-header"><span class="card-title">💧 Daily Progress</span></div>
          <div class="card-body" id="water-progress"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">Log Water</span>
          </div>
          <div class="card-body">
            <div class="water-btns" style="margin-bottom:16px">
              <button class="water-btn" onclick="WaterPage.quickLog(0.1)">+100ml</button>
              <button class="water-btn" onclick="WaterPage.quickLog(0.25)">+250ml</button>
              <button class="water-btn" onclick="WaterPage.quickLog(0.33)">+330ml</button>
              <button class="water-btn" onclick="WaterPage.quickLog(0.5)">+500ml</button>
              <button class="water-btn" onclick="WaterPage.quickLog(0.75)">+750ml</button>
              <button class="water-btn" onclick="WaterPage.quickLog(1)">+1L</button>
            </div>
            <div style="display:flex;gap:10px;align-items:flex-end">
              <div class="form-group" style="flex:1;margin:0">
                <label class="form-label">Custom Amount (liters)</label>
                <input type="number" id="water-custom" class="form-input" placeholder="e.g. 0.4" min="0.05" step="0.05">
              </div>
              <button class="btn btn-primary" onclick="WaterPage.logCustom()">Add</button>
            </div>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:18px">
        <div class="card-header"><span class="card-title">Today's Log</span></div>
        <div class="card-body" id="water-log-list"></div>
      </div>
    `;
    await this.loadData();
  },

  changeDate() { this.currentDate = $('#water-date').value; this.loadData(); },

  async loadData() {
    try {
      const res = await api.get(`/water/summary?date=${this.currentDate}`);
      this.logs = res.data.logs || [];
      this.renderProgress(res.data);
      this.renderList();
    } catch(e) { Toast.show('Failed to load water data', 'error'); }
  },

  renderProgress(data) {
    const user = Auth.getUser();
    const goal = user?.dailyWaterGoal || 2.5;
    const amount = data.totalAmount || 0;
    const pct = Math.min(100, Math.round((amount / goal) * 100));
    $('#water-progress').innerHTML = `
      <div class="water-display">
        <div class="water-circle" style="background:conic-gradient(var(--accent3) ${pct*3.6}deg, var(--bg3) 0deg)">
          <div class="water-circle-inner">
            <div class="water-amount">${Num.fmtDec(amount)}</div>
            <div class="water-unit">of ${goal}L</div>
          </div>
        </div>
        <div style="width:100%">
          <div class="progress-header">
            <span class="progress-label">${pct >= 100 ? '🎉 Goal reached!' : 'Progress'}</span>
            <span class="progress-value">${pct}%</span>
          </div>
          <div class="progress-bar"><div class="progress-fill blue" style="width:${pct}%"></div></div>
          <div style="font-size:12px;color:var(--text3);margin-top:6px">${pct < 100 ? `${Num.fmtDec(Math.max(0, goal-amount))}L more to go` : 'You hit your daily goal!'}</div>
        </div>
        <div style="text-align:center;font-size:13px;color:var(--text3)">${data.logCount || 0} entries today</div>
      </div>
    `;
  },

  renderList() {
    const el = $('#water-log-list');
    if (!this.logs.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">💧</div><div class="empty-title">No water logged yet</div></div>`;
      return;
    }
    el.innerHTML = this.logs.map(l => `
      <div class="log-item">
        <div style="font-size:24px">💧</div>
        <div class="log-item-info">
          <div class="log-item-name">${Num.fmtDec(l.amount)}L</div>
          <div class="log-item-meta">${DateUtils.formatTime(l.date)}${l.notes ? ' · ' + l.notes : ''}</div>
        </div>
        <div class="log-item-actions" style="opacity:1">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="WaterPage.deleteLog('${l._id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  },

  async quickLog(amount) {
    try {
      await api.post('/water', { amount, date: this.currentDate });
      Toast.show(`+${amount * 1000}ml logged 💧`, 'success');
      await this.loadData();
      // Also refresh dashboard if active
    } catch(e) { Toast.show(e.message, 'error'); }
  },

  async logCustom() {
    const amount = parseFloat($('#water-custom').value);
    if (!amount || amount <= 0) { Toast.show('Enter a valid amount', 'error'); return; }
    await this.quickLog(amount);
    $('#water-custom').value = '';
  },

  async deleteLog(id) {
    try {
      await api.delete(`/water/${id}`);
      Toast.show('Entry deleted', 'info');
      await this.loadData();
    } catch(e) { Toast.show(e.message, 'error'); }
  }
};

// ===== GOALS PAGE =====
const GoalsPage = {
  charts: {},
  async render() {
    $('#page-content').innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Goals & Progress</h1>
        <button class="btn btn-primary" onclick="GoalsPage.openEditGoal()">Edit Goals</button>
      </div>
      <div class="stats-grid" id="goals-stats"></div>
      <div class="chart-grid">
        <div class="card">
          <div class="card-header"><span class="card-title">📊 Weekly Calorie Trend</span></div>
          <div class="card-body"><div class="chart-container"><canvas id="goals-cal-chart"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">💧 Weekly Water Intake</span></div>
          <div class="card-body"><div class="chart-container"><canvas id="goals-water-chart"></canvas></div></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
        <div class="card">
          <div class="card-header"><span class="card-title">📈 BMI Tracker</span></div>
          <div class="card-body" id="goals-bmi"></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">🎯 Calorie Suggestion</span></div>
          <div class="card-body" id="goals-suggestion"></div>
        </div>
      </div>
      <div class="modal-overlay" id="goal-modal">
        <div class="modal">
          <div class="modal-header"><h2 class="modal-title">Edit Goals</h2><button class="modal-close" onclick="GoalsPage.closeModal()">×</button></div>
          <div class="modal-body">
            <form id="goal-form" onsubmit="GoalsPage.saveGoal(event)">
              <div class="form-group">
                <label class="form-label">Fitness Goal</label>
                <select id="goal-select" class="form-select">
                  <option value="weight_loss">Weight Loss</option>
                  <option value="weight_gain">Weight Gain</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="muscle_building">Muscle Building</option>
                  <option value="endurance">Endurance</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Activity Level</label>
                <select id="activity-select" class="form-select">
                  <option value="sedentary">Sedentary (desk job)</option>
                  <option value="lightly_active">Lightly Active (1-3 days/wk)</option>
                  <option value="moderately_active">Moderately Active (3-5 days/wk)</option>
                  <option value="very_active">Very Active (6-7 days/wk)</option>
                  <option value="extra_active">Extra Active (athlete)</option>
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Weight (kg)</label>
                  <input type="number" id="goal-weight" class="form-input" min="1" step="0.1">
                </div>
                <div class="form-group">
                  <label class="form-label">Height (cm)</label>
                  <input type="number" id="goal-height" class="form-input" min="1">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Daily Water Goal (liters)</label>
                <input type="number" id="goal-water" class="form-input" min="0.5" max="10" step="0.1">
              </div>
              <div style="display:flex;gap:10px;justify-content:flex-end">
                <button type="button" class="btn btn-secondary" onclick="GoalsPage.closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary" id="goal-save-btn">Save Goals</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    await this.loadData();
  },

  async loadData() {
    try {
      const [profile, weeklyDiet, weeklyWater] = await Promise.all([
        api.get('/users/profile'),
        api.get('/diet/weekly'),
        api.get('/water/weekly'),
      ]);
      this.renderStats(profile.data);
      this.renderCharts(weeklyDiet.data, weeklyWater.data, profile.data);
      this.renderBMI(profile.data);
      this.renderSuggestion(profile.data);
    } catch(e) { Toast.show('Failed to load goals data', 'error'); }
  },

  renderStats(u) {
    const bmi = u.bmi;
    const goal = (u.fitnessGoal||'maintenance').replace(/_/g,' ');
    const activity = (u.activityLevel||'').replace(/_/g,' ');
    $('#goals-stats').innerHTML = `
      <div class="stat-card"><div class="stat-icon green">⚖️</div><div class="stat-info"><div class="stat-value">${u.weight||'—'} kg</div><div class="stat-label">Current Weight</div></div></div>
      <div class="stat-card"><div class="stat-icon blue">📏</div><div class="stat-info"><div class="stat-value">${bmi||'—'}</div><div class="stat-label">BMI</div><div class="stat-change up" style="text-transform:capitalize">${getBMICategory(bmi)}</div></div></div>
      <div class="stat-card"><div class="stat-icon orange">🎯</div><div class="stat-info"><div class="stat-value" style="font-size:16px;text-transform:capitalize">${goal}</div><div class="stat-label">Fitness Goal</div></div></div>
      <div class="stat-card"><div class="stat-icon red">🔥</div><div class="stat-info"><div class="stat-value">${Num.fmt(u.dailyCalorieGoal||2000)}</div><div class="stat-label">Daily Calorie Goal</div></div></div>
    `;
  },

  renderCharts(weeklyDiet, weeklyWater, user) {
    const days = DateUtils.getLast7Days();
    const labels = days.map(d => DateUtils.getDayLabel(d));
    const calGoal = user?.dailyCalorieGoal || 2000;
    const waterGoal = user?.dailyWaterGoal || 2.5;

    if (this.charts.cal) this.charts.cal.destroy();
    const calCtx = document.getElementById('goals-cal-chart');
    if (calCtx) {
      this.charts.cal = new Chart(calCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Consumed', data: days.map(d => weeklyDiet[d]?.calories||0), backgroundColor: 'rgba(0,208,132,0.7)', borderRadius: 6, borderSkipped: false },
            { label: 'Goal', data: days.map(() => calGoal), type: 'line', borderColor: '#ff6b6b', borderDash: [5,5], fill: false, pointRadius: 0 }
          ]
        },
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{position:'bottom'} }, scales: { x:{ grid:{display:false} }, y:{ beginAtZero:true } } }
      });
    }

    if (this.charts.water) this.charts.water.destroy();
    const wCtx = document.getElementById('goals-water-chart');
    if (wCtx) {
      this.charts.water = new Chart(wCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Intake (L)', data: days.map(d => weeklyWater[d]||0), backgroundColor: 'rgba(116,192,252,0.7)', borderRadius: 6, borderSkipped: false },
            { label: 'Goal', data: days.map(() => waterGoal), type: 'line', borderColor: '#ffa94d', borderDash: [5,5], fill: false, pointRadius: 0 }
          ]
        },
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{position:'bottom'} }, scales: { x:{ grid:{display:false} }, y:{ beginAtZero:true } } }
      });
    }
  },

  renderBMI(u) {
    const bmi = parseFloat(u.bmi);
    const cat = getBMICategory(bmi);
    const cls = getBMIClass(bmi);
    $('#goals-bmi').innerHTML = `
      <div class="bmi-display">
        <div class="bmi-value ${cls}">${bmi || '—'}</div>
        <div class="bmi-category ${cls}" style="margin:8px auto;display:inline-block">${cat}</div>
        <div style="font-size:13px;color:var(--text3);margin:12px 0">Height: ${u.height||'—'} cm &nbsp;·&nbsp; Weight: ${u.weight||'—'} kg</div>
        <div class="bmi-scale"><div style="flex:1;background:rgba(116,192,252,0.5)"></div><div style="flex:1;background:rgba(0,208,132,0.5)"></div><div style="flex:1;background:rgba(255,169,77,0.5)"></div><div style="flex:1;background:rgba(255,107,107,0.5)"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-top:4px"><span>Underweight</span><span>Normal</span><span>Overweight</span><span>Obese</span></div>
      </div>
    `;
  },

  renderSuggestion(u) {
    const tdee = u.tdee || 2000;
    const goal = u.fitnessGoal || 'maintenance';
    const tips = {
      weight_loss: ['Aim for a 500 calorie daily deficit', 'Focus on high-protein foods', 'Include cardio 4-5 times/week'],
      weight_gain: ['Aim for a 500 calorie daily surplus', 'Prioritize strength training', 'Eat calorie-dense whole foods'],
      muscle_building: ['Eat 1.6-2.2g protein per kg bodyweight', 'Progressive overload in strength training', 'Ensure adequate sleep for recovery'],
      maintenance: ['Balance calories in vs out', 'Mix cardio and strength training', 'Stay consistent with habits'],
      endurance: ['Carb-load before long sessions', 'Stay well hydrated', 'Train consistently with varied intensity'],
    };
    const goalTips = tips[goal] || tips.maintenance;
    $('#goals-suggestion').innerHTML = `
      <div style="text-align:center;padding:10px 0 20px">
        <div style="font-size:40px;margin-bottom:8px">🔥</div>
        <div style="font-family:var(--font-display);font-size:32px;font-weight:700">${Num.fmt(tdee)}</div>
        <div style="font-size:13px;color:var(--text3)">Recommended daily calories (TDEE)</div>
      </div>
      <div style="border-top:1px solid var(--card-border);padding-top:16px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text3);margin-bottom:10px">Tips for ${goal.replace(/_/g,' ')}</div>
        ${goalTips.map(t => `<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;font-size:13px"><span style="color:var(--primary)">✓</span><span>${t}</span></div>`).join('')}
      </div>
    `;
  },

  openEditGoal() {
    const u = Auth.getUser();
    if ($('#goal-select')) $('#goal-select').value = u.fitnessGoal || 'maintenance';
    if ($('#activity-select')) $('#activity-select').value = u.activityLevel || 'moderately_active';
    if ($('#goal-weight')) $('#goal-weight').value = u.weight || '';
    if ($('#goal-height')) $('#goal-height').value = u.height || '';
    if ($('#goal-water')) $('#goal-water').value = u.dailyWaterGoal || 2.5;
    $('#goal-modal').classList.add('active');
  },

  closeModal() { $('#goal-modal').classList.remove('active'); },

  async saveGoal(e) {
    e.preventDefault();
    const btn = $('#goal-save-btn');
    const data = {
      fitnessGoal: $('#goal-select').value,
      activityLevel: $('#activity-select').value,
      weight: parseFloat($('#goal-weight').value) || undefined,
      height: parseFloat($('#goal-height').value) || undefined,
      dailyWaterGoal: parseFloat($('#goal-water').value) || 2.5,
    };
    setLoading(btn, true);
    try {
      const res = await api.put('/auth/update-profile', data);
      Auth.setAuth(localStorage.getItem('fittrack_token'), res.user);
      Toast.show('Goals updated!', 'success');
      this.closeModal();
      await this.loadData();
    } catch(e) { Toast.show(e.message, 'error'); }
    finally { setLoading(btn, false); }
  }
};

// ===== PROFILE PAGE =====
const ProfilePage = {
  async render() {
    const user = Auth.getUser();
    $('#page-content').innerHTML = `
      <div class="page-header">
        <h1 class="page-title">My Profile</h1>
      </div>
      <div style="display:grid;grid-template-columns:1fr 2fr;gap:18px">
        <div class="card">
          <div class="card-body" style="text-align:center;padding:32px 24px">
            <div style="width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,var(--primary),var(--accent3));display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:700;color:#fff;margin:0 auto 16px">${user?.name?.charAt(0)||'U'}</div>
            <div style="font-family:var(--font-display);font-size:20px;font-weight:700">${user?.name||'User'}</div>
            <div style="font-size:13px;color:var(--text3);margin-top:4px">${user?.email||''}</div>
            <div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:10px;font-size:13px">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:var(--text3)">Member since</span><span style="font-weight:600">${new Date(user?.createdAt||Date.now()).getFullYear()}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text3)">Goal</span><span style="font-weight:600;text-transform:capitalize">${(user?.fitnessGoal||'').replace(/_/g,' ')}</span></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Edit Profile</span></div>
          <div class="card-body">
            <form id="profile-form" onsubmit="ProfilePage.saveProfile(event)">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Full Name</label>
                  <input type="text" id="prof-name" class="form-input" value="${user?.name||''}">
                </div>
                <div class="form-group">
                  <label class="form-label">Age</label>
                  <input type="number" id="prof-age" class="form-input" value="${user?.age||''}" min="1" max="120">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Weight (kg)</label>
                  <input type="number" id="prof-weight" class="form-input" value="${user?.weight||''}" min="1" step="0.1">
                </div>
                <div class="form-group">
                  <label class="form-label">Height (cm)</label>
                  <input type="number" id="prof-height" class="form-input" value="${user?.height||''}" min="1">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Gender</label>
                  <select id="prof-gender" class="form-select">
                    <option value="">Select</option>
                    <option value="male" ${user?.gender==='male'?'selected':''}>Male</option>
                    <option value="female" ${user?.gender==='female'?'selected':''}>Female</option>
                    <option value="other" ${user?.gender==='other'?'selected':''}>Other</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Fitness Goal</label>
                  <select id="prof-goal" class="form-select">
                    <option value="weight_loss" ${user?.fitnessGoal==='weight_loss'?'selected':''}>Weight Loss</option>
                    <option value="weight_gain" ${user?.fitnessGoal==='weight_gain'?'selected':''}>Weight Gain</option>
                    <option value="maintenance" ${user?.fitnessGoal==='maintenance'?'selected':''}>Maintenance</option>
                    <option value="muscle_building" ${user?.fitnessGoal==='muscle_building'?'selected':''}>Muscle Building</option>
                    <option value="endurance" ${user?.fitnessGoal==='endurance'?'selected':''}>Endurance</option>
                  </select>
                </div>
              </div>
              <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
                <button type="submit" class="btn btn-primary" id="prof-save-btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:18px">
        <div class="card-header"><span class="card-title">🔒 Change Password</span></div>
        <div class="card-body">
          <form id="pwd-form" onsubmit="ProfilePage.changePassword(event)">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Current Password</label>
                <input type="password" id="pwd-current" class="form-input" placeholder="••••••••">
              </div>
              <div class="form-group">
                <label class="form-label">New Password</label>
                <input type="password" id="pwd-new" class="form-input" placeholder="Min 6 characters">
              </div>
            </div>
            <button type="submit" class="btn btn-secondary" id="pwd-btn">Update Password</button>
          </form>
        </div>
      </div>
      <div class="card" style="margin-top:18px">
        <div class="card-header"><span class="card-title">🚪 Account Actions</span></div>
        <div class="card-body" style="display:flex;gap:12px">
          <button class="btn btn-secondary" onclick="App.logout()">Logout</button>
        </div>
      </div>
    `;
  },

  async saveProfile(e) {
    e.preventDefault();
    const btn = $('#prof-save-btn');
    const data = {
      name: $('#prof-name').value.trim(),
      age: parseInt($('#prof-age').value) || undefined,
      weight: parseFloat($('#prof-weight').value) || undefined,
      height: parseFloat($('#prof-height').value) || undefined,
      gender: $('#prof-gender').value || undefined,
      fitnessGoal: $('#prof-goal').value,
    };
    setLoading(btn, true);
    try {
      const res = await api.put('/auth/update-profile', data);
      Auth.setAuth(localStorage.getItem('fittrack_token'), res.user);
      Toast.show('Profile updated!', 'success');
      App.renderSidebar();
    } catch(e) { Toast.show(e.message, 'error'); }
    finally { setLoading(btn, false); }
  },

  async changePassword(e) {
    e.preventDefault();
    const btn = $('#pwd-btn');
    const currentPassword = $('#pwd-current').value;
    const newPassword = $('#pwd-new').value;
    if (!currentPassword || !newPassword) { Toast.show('Fill both fields', 'error'); return; }
    if (newPassword.length < 6) { Toast.show('New password too short', 'error'); return; }
    setLoading(btn, true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      Toast.show('Password changed!', 'success');
      document.getElementById('pwd-form').reset();
    } catch(e) { Toast.show(e.message, 'error'); }
    finally { setLoading(btn, false); }
  }
};

// ===== ADMIN PAGE =====
const AdminPage = {
  users: [],
  currentPage: 1,

  async render() {
    if (!Auth.isAdmin()) { App.showPage('dashboard'); return; }
    $('#page-content').innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Admin Panel</h1><p class="page-subtitle">Manage users and view analytics</p></div>
      </div>
      <div class="admin-grid" id="admin-stats"></div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">👥 All Users</span>
          <div style="display:flex;gap:10px">
            <input type="text" id="admin-search" class="form-input" placeholder="Search users..." oninput="AdminPage.loadUsers()" style="max-width:220px">
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Goal</th><th>Weight</th><th>Joined</th><th>Last Active</th><th>Actions</th></tr></thead>
            <tbody id="admin-users-tbody"></tbody>
          </table>
        </div>
        <div id="admin-pagination" style="padding:16px 24px;display:flex;gap:8px;justify-content:flex-end"></div>
      </div>
    `;
    await Promise.all([this.loadStats(), this.loadUsers()]);
  },

  async loadStats() {
    try {
      const res = await api.get('/admin/stats');
      const s = res.data;
      $('#admin-stats').innerHTML = `
        <div class="admin-stat"><div class="admin-stat-num" style="color:var(--primary)">${s.totalUsers}</div><div class="admin-stat-label">Total Users</div></div>
        <div class="admin-stat"><div class="admin-stat-num" style="color:var(--accent3)">${s.activeUsers}</div><div class="admin-stat-label">Active (30 days)</div></div>
        <div class="admin-stat"><div class="admin-stat-num" style="color:var(--accent2)">${s.newUsersThisWeek}</div><div class="admin-stat-label">New This Week</div></div>
        <div class="admin-stat"><div class="admin-stat-num" style="color:var(--accent)">${s.totalWorkouts}</div><div class="admin-stat-label">Total Workouts</div></div>
        <div class="admin-stat"><div class="admin-stat-num" style="color:var(--primary)">${s.totalDietLogs}</div><div class="admin-stat-label">Diet Entries</div></div>
        <div class="admin-stat"><div class="admin-stat-num" style="color:var(--accent3)">${s.totalWaterLogs}</div><div class="admin-stat-label">Water Logs</div></div>
      `;
    } catch(e) {}
  },

  async loadUsers() {
    const search = $('#admin-search')?.value || '';
    try {
      const res = await api.get(`/admin/users?page=${this.currentPage}&limit=15${search?'&search='+search:''}`);
      this.users = res.data;
      this.renderUsers(res.data);
    } catch(e) { Toast.show('Failed to load users', 'error'); }
  },

  renderUsers(users) {
    const tbody = $('#admin-users-tbody');
    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3)">No users found</td></tr>`;
      return;
    }
    tbody.innerHTML = users.map(u => `
      <tr>
        <td><div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,var(--primary),var(--accent3));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:#fff">${u.name.charAt(0)}</div>
          <span style="font-weight:600">${u.name}</span>
        </div></td>
        <td style="color:var(--text2)">${u.email}</td>
        <td style="text-transform:capitalize">${(u.fitnessGoal||'').replace(/_/g,' ')||'—'}</td>
        <td>${u.weight ? u.weight + ' kg' : '—'}</td>
        <td style="color:var(--text3)">${DateUtils.format(u.createdAt)}</td>
        <td style="color:var(--text3)">${DateUtils.format(u.lastActive)}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="AdminPage.deleteUser('${u._id}','${u.name}')">Delete</button>
        </td>
      </tr>
    `).join('');
  },

  async deleteUser(id, name) {
    if (!confirm(`Delete user "${name}" and all their data? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      Toast.show(`User ${name} deleted`, 'info');
      await this.loadUsers();
      await this.loadStats();
    } catch(e) { Toast.show(e.message, 'error'); }
  }
};
