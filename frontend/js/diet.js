const DietPage = {
  currentDate: DateUtils.today(),
  logs: [],
  editing: null,

  async render() {
    const content = $('#page-content');
    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Diet Tracker</h1>
          <p class="page-subtitle">Log and manage your daily meals</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <input type="date" id="diet-date" class="form-input" value="${this.currentDate}" style="max-width:180px" onchange="DietPage.changeDate()">
          <button class="btn btn-primary" onclick="DietPage.openAddModal()">+ Add Meal</button>
          <button class="btn btn-secondary btn-icon" title="Export CSV" onclick="DietPage.exportData()">📥</button>
        </div>
      </div>
      <div class="stats-grid" id="diet-stats"></div>
      <div class="filter-bar">
        <input type="text" id="diet-search" class="form-input" placeholder="🔍 Search meals..." oninput="DietPage.applyFilters()" style="max-width:240px">
        <select id="diet-filter-meal" class="form-select" onchange="DietPage.applyFilters()" style="max-width:160px">
          <option value="">All Meals</option>
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
      </div>
      <div id="diet-logs"></div>
      ${this.modalHTML()}
    `;
    await this.loadData();
  },

  changeDate() {
    this.currentDate = $('#diet-date').value;
    this.loadData();
  },

  async loadData() {
    try {
      const [logsRes, summaryRes] = await Promise.all([
        api.get(`/diet?date=${this.currentDate}`),
        api.get(`/diet/summary?date=${this.currentDate}`)
      ]);
      this.logs = logsRes.data;
      this.renderStats(summaryRes.data);
      this.applyFilters();
    } catch(e) {
      Toast.show('Failed to load diet data', 'error');
    }
  },

  renderStats(s) {
    const user = Auth.getUser();
    const calGoal = user?.dailyCalorieGoal || 2000;
    const pct = Math.min(100, Math.round((s.totalCalories / calGoal) * 100)) || 0;
    $('#diet-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-icon red">🔥</div>
        <div class="stat-info">
          <div class="stat-value">${Num.fmt(s.totalCalories)}</div>
          <div class="stat-label">Total Calories</div>
          <div class="progress-bar" style="margin-top:8px"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div style="font-size:11px;color:var(--text3);margin-top:3px">${pct}% of ${Num.fmt(calGoal)} goal</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">🥩</div>
        <div class="stat-info">
          <div class="stat-value">${Num.fmt(s.totalProtein)}g</div>
          <div class="stat-label">Protein</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">🌾</div>
        <div class="stat-info">
          <div class="stat-value">${Num.fmt(s.totalCarbs)}g</div>
          <div class="stat-label">Carbohydrates</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">🧈</div>
        <div class="stat-info">
          <div class="stat-value">${Num.fmt(s.totalFats)}g</div>
          <div class="stat-label">Fats</div>
        </div>
      </div>
    `;
  },

  applyFilters() {
    const search = ($('#diet-search')?.value || '').toLowerCase();
    const mealFilter = $('#diet-filter-meal')?.value || '';
    let filtered = this.logs.filter(l =>
      (!search || l.foodName.toLowerCase().includes(search)) &&
      (!mealFilter || l.mealType === mealFilter)
    );
    this.renderLogs(filtered);
  },

  renderLogs(logs) {
    if (!logs.length) {
      $('#diet-logs').innerHTML = `<div class="card"><div class="empty-state">
        <div class="empty-icon">🥗</div>
        <div class="empty-title">No meals logged</div>
        <div class="empty-msg">Start tracking your food intake for ${this.currentDate}</div>
        <button class="btn btn-primary" style="margin-top:16px" onclick="DietPage.openAddModal()">Add First Meal</button>
      </div></div>`;
      return;
    }
    const grouped = { breakfast: [], lunch: [], dinner: [], snack: [] };
    logs.forEach(l => (grouped[l.mealType] || grouped.snack).push(l));
    const mealLabels = { breakfast: '🌅 Breakfast', lunch: '☀️ Lunch', dinner: '🌙 Dinner', snack: '🍎 Snack' };
    let html = '';
    Object.entries(grouped).forEach(([type, items]) => {
      if (!items.length) return;
      const total = items.reduce((s, i) => s + (i.calories || 0), 0);
      html += `<div class="card" style="margin-bottom:16px">
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:10px">
            <span class="meal-badge ${type}">${mealLabels[type]}</span>
            <span style="font-size:13px;color:var(--text3)">${items.length} item${items.length>1?'s':''}</span>
          </div>
          <span style="font-family:var(--font-display);font-weight:700;color:var(--text2)">${Num.fmt(total)} kcal</span>
        </div>
        <div class="card-body" style="padding:16px">
          ${items.map(item => `
            <div class="log-item">
              <div class="log-item-info">
                <div class="log-item-name">${item.foodName}</div>
                <div class="log-item-meta">${item.servingSize || '1 serving'} · P: ${item.protein||0}g · C: ${item.carbs||0}g · F: ${item.fats||0}g</div>
              </div>
              <div class="log-item-cal">${Num.fmt(item.calories)} kcal</div>
              <div class="log-item-actions">
                <button class="btn btn-ghost btn-icon btn-sm" onclick="DietPage.openEditModal('${item._id}')" title="Edit">✏️</button>
                <button class="btn btn-ghost btn-icon btn-sm" onclick="DietPage.deleteLog('${item._id}')" title="Delete">🗑️</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
    });
    $('#diet-logs').innerHTML = html;
  },

  modalHTML() {
    return `
      <div class="modal-overlay" id="diet-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title" id="diet-modal-title">Add Meal</h2>
            <button class="modal-close" onclick="DietPage.closeModal()">×</button>
          </div>
          <div class="modal-body">
            <form id="diet-form" onsubmit="DietPage.handleSubmit(event)">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Meal Type *</label>
                  <select id="meal-type" class="form-select" required>
                    <option value="breakfast">🌅 Breakfast</option>
                    <option value="lunch">☀️ Lunch</option>
                    <option value="dinner">🌙 Dinner</option>
                    <option value="snack">🍎 Snack</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Serving Size</label>
                  <input type="text" id="meal-serving" class="form-input" placeholder="e.g. 1 cup">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Food Name *</label>
                <input type="text" id="meal-name" class="form-input" placeholder="e.g. Grilled Chicken Breast" required>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Calories (kcal) *</label>
                  <input type="number" id="meal-cal" class="form-input" placeholder="200" min="0" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Protein (g)</label>
                  <input type="number" id="meal-protein" class="form-input" placeholder="20" min="0" step="0.1">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Carbs (g)</label>
                  <input type="number" id="meal-carbs" class="form-input" placeholder="30" min="0" step="0.1">
                </div>
                <div class="form-group">
                  <label class="form-label">Fats (g)</label>
                  <input type="number" id="meal-fats" class="form-input" placeholder="10" min="0" step="0.1">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Notes</label>
                <input type="text" id="meal-notes" class="form-input" placeholder="Optional notes...">
              </div>
              <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
                <button type="button" class="btn btn-secondary" onclick="DietPage.closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary" id="diet-submit-btn">Add Meal</button>
              </div>
            </form>
          </div>
        </div>
      </div>`;
  },

  openAddModal() {
    this.editing = null;
    $('#diet-modal-title').textContent = 'Add Meal';
    $('#diet-submit-btn').textContent = 'Add Meal';
    document.getElementById('diet-form').reset();
    $('#diet-modal').classList.add('active');
  },

  openEditModal(id) {
    const item = this.logs.find(l => l._id === id);
    if (!item) return;
    this.editing = id;
    $('#diet-modal-title').textContent = 'Edit Meal';
    $('#diet-submit-btn').textContent = 'Update Meal';
    $('#meal-type').value = item.mealType;
    $('#meal-name').value = item.foodName;
    $('#meal-cal').value = item.calories;
    $('#meal-protein').value = item.protein || '';
    $('#meal-carbs').value = item.carbs || '';
    $('#meal-fats').value = item.fats || '';
    $('#meal-serving').value = item.servingSize || '';
    $('#meal-notes').value = item.notes || '';
    $('#diet-modal').classList.add('active');
  },

  closeModal() { $('#diet-modal').classList.remove('active'); },

  async handleSubmit(e) {
    e.preventDefault();
    const btn = $('#diet-submit-btn');
    const data = {
      mealType: $('#meal-type').value,
      foodName: $('#meal-name').value.trim(),
      calories: parseFloat($('#meal-cal').value),
      protein: parseFloat($('#meal-protein').value) || 0,
      carbs: parseFloat($('#meal-carbs').value) || 0,
      fats: parseFloat($('#meal-fats').value) || 0,
      servingSize: $('#meal-serving').value.trim(),
      notes: $('#meal-notes').value.trim(),
      date: this.currentDate,
    };
    setLoading(btn, true);
    try {
      if (this.editing) {
        await api.put(`/diet/${this.editing}`, data);
        Toast.show('Meal updated!', 'success');
      } else {
        await api.post('/diet', data);
        Toast.show('Meal added!', 'success');
      }
      this.closeModal();
      await this.loadData();
    } catch(e) {
      Toast.show(e.message, 'error');
    } finally {
      setLoading(btn, false);
    }
  },

  async deleteLog(id) {
    if (!confirm('Delete this meal entry?')) return;
    try {
      await api.delete(`/diet/${id}`);
      Toast.show('Meal deleted', 'info');
      await this.loadData();
    } catch(e) {
      Toast.show(e.message, 'error');
    }
  },

  exportData() {
    exportCSV(
      this.logs,
      `diet-log-${this.currentDate}.csv`,
      ['Date', 'Meal Type', 'Food Name', 'Calories', 'Protein(g)', 'Carbs(g)', 'Fats(g)', 'Serving'],
      l => [DateUtils.format(l.date), l.mealType, l.foodName, l.calories, l.protein||0, l.carbs||0, l.fats||0, l.servingSize||'']
    );
  }
};
