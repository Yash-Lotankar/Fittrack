const WorkoutPage = {
  currentDate: DateUtils.today(),
  workouts: [],
  editing: null,

  async render() {
    const content = $('#page-content');
    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Workout Tracker</h1>
          <p class="page-subtitle">Track your exercises and calorie burn</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <input type="date" id="workout-date" class="form-input" value="${this.currentDate}" style="max-width:180px" onchange="WorkoutPage.changeDate()">
          <button class="btn btn-primary" onclick="WorkoutPage.openAddModal()">+ Add Workout</button>
          <button class="btn btn-secondary btn-icon" title="Export" onclick="WorkoutPage.exportData()">📥</button>
        </div>
      </div>
      <div class="stats-grid" id="workout-stats"></div>
      <div class="filter-bar">
        <input type="text" id="workout-search" class="form-input" placeholder="🔍 Search workouts..." oninput="WorkoutPage.applyFilters()" style="max-width:240px">
        <select id="workout-filter-cat" class="form-select" onchange="WorkoutPage.applyFilters()" style="max-width:160px">
          <option value="">All Categories</option>
          <option value="cardio">🏃 Cardio</option>
          <option value="strength">🏋️ Strength</option>
          <option value="yoga">🧘 Yoga</option>
          <option value="hiit">⚡ HIIT</option>
          <option value="other">💪 Other</option>
        </select>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">Today's Workouts</span>
          <span id="workout-total-dur" style="font-size:13px;color:var(--text3)"></span>
        </div>
        <div class="card-body" id="workout-list"></div>
      </div>
      ${this.modalHTML()}
    `;
    await this.loadData();
  },

  changeDate() {
    this.currentDate = $('#workout-date').value;
    this.loadData();
  },

  async loadData() {
    try {
      const [workoutsRes, summaryRes] = await Promise.all([
        api.get(`/workouts?date=${this.currentDate}`),
        api.get(`/workouts/summary?date=${this.currentDate}`)
      ]);
      this.workouts = workoutsRes.data;
      this.renderStats(summaryRes.data);
      this.applyFilters();
    } catch(e) {
      Toast.show('Failed to load workout data', 'error');
    }
  },

  renderStats(s) {
    const totalDur = s.totalDuration || 0;
    const h = Math.floor(totalDur / 60), m = totalDur % 60;
    const durStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
    if ($('#workout-total-dur')) $('#workout-total-dur').textContent = `Total: ${durStr}`;
    const cats = Object.entries(s.categoryCounts || {});
    const topCat = cats.sort((a,b) => b[1]-a[1])[0];
    $('#workout-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-icon red">🔥</div>
        <div class="stat-info">
          <div class="stat-value">${Num.fmt(s.totalCaloriesBurned)}</div>
          <div class="stat-label">Calories Burned</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">⏱️</div>
        <div class="stat-info">
          <div class="stat-value">${durStr}</div>
          <div class="stat-label">Active Time</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">🏆</div>
        <div class="stat-info">
          <div class="stat-value">${s.workoutCount || 0}</div>
          <div class="stat-label">Workouts Logged</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">⭐</div>
        <div class="stat-info">
          <div class="stat-value" style="font-size:16px;text-transform:capitalize">${topCat ? topCat[0] : 'N/A'}</div>
          <div class="stat-label">Top Category</div>
        </div>
      </div>
    `;
  },

  applyFilters() {
    const search = ($('#workout-search')?.value || '').toLowerCase();
    const catFilter = $('#workout-filter-cat')?.value || '';
    let filtered = this.workouts.filter(w =>
      (!search || w.name.toLowerCase().includes(search)) &&
      (!catFilter || w.category === catFilter)
    );
    this.renderList(filtered);
  },

  renderList(workouts) {
    const list = $('#workout-list');
    if (!workouts.length) {
      list.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🏋️</div>
        <div class="empty-title">No workouts logged</div>
        <div class="empty-msg">Add your first workout for today</div>
        <button class="btn btn-primary" style="margin-top:16px" onclick="WorkoutPage.openAddModal()">Add Workout</button>
      </div>`;
      return;
    }
    list.innerHTML = workouts.map(w => {
      const dur = w.duration >= 60 ? `${Math.floor(w.duration/60)}h ${w.duration%60}m` : `${w.duration}m`;
      const extra = w.category === 'strength' && w.sets ? `· ${w.sets}×${w.reps||0}` : w.distance ? `· ${w.distance}km` : '';
      return `
        <div class="workout-item">
          <div class="workout-cat-icon ${w.category}">${CAT_ICONS[w.category] || '💪'}</div>
          <div class="workout-info">
            <div class="workout-name">${w.name}</div>
            <div class="workout-meta">
              <span class="tag tag-${w.category}">${w.category}</span>
              &nbsp;${dur} ${extra}
              ${w.intensity ? `· ${w.intensity}` : ''}
            </div>
          </div>
          <div class="workout-stats">
            <div class="workout-cal">${Num.fmt(w.caloriesBurned)} kcal</div>
            <div class="workout-dur">${DateUtils.formatTime(w.date)}</div>
          </div>
          <div class="workout-item-actions">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="WorkoutPage.openEditModal('${w._id}')">✏️</button>
            <button class="btn btn-ghost btn-icon btn-sm" onclick="WorkoutPage.deleteWorkout('${w._id}')">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  },

  modalHTML() {
    return `
      <div class="modal-overlay" id="workout-modal">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title" id="workout-modal-title">Add Workout</h2>
            <button class="modal-close" onclick="WorkoutPage.closeModal()">×</button>
          </div>
          <div class="modal-body">
            <form id="workout-form" onsubmit="WorkoutPage.handleSubmit(event)">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Category *</label>
                  <select id="workout-cat" class="form-select" required onchange="WorkoutPage.toggleFields()">
                    <option value="cardio">🏃 Cardio</option>
                    <option value="strength">🏋️ Strength</option>
                    <option value="yoga">🧘 Yoga</option>
                    <option value="hiit">⚡ HIIT</option>
                    <option value="sports">⚽ Sports</option>
                    <option value="flexibility">🤸 Flexibility</option>
                    <option value="other">💪 Other</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Intensity</label>
                  <select id="workout-intensity" class="form-select">
                    <option value="low">Low</option>
                    <option value="moderate" selected>Moderate</option>
                    <option value="high">High</option>
                    <option value="very_high">Very High</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Exercise Name *</label>
                <input type="text" id="workout-name" class="form-input" placeholder="e.g. Morning Run" required>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Duration (min) *</label>
                  <input type="number" id="workout-dur" class="form-input" placeholder="30" min="1" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Calories Burned</label>
                  <input type="number" id="workout-cal-burned" class="form-input" placeholder="250" min="0">
                </div>
              </div>
              <div id="strength-fields" style="display:none">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Sets</label>
                    <input type="number" id="workout-sets" class="form-input" placeholder="3" min="1">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Reps</label>
                    <input type="number" id="workout-reps" class="form-input" placeholder="12" min="1">
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Weight (kg)</label>
                  <input type="number" id="workout-weight" class="form-input" placeholder="60" min="0" step="0.5">
                </div>
              </div>
              <div id="cardio-fields" style="display:none">
                <div class="form-group">
                  <label class="form-label">Distance (km)</label>
                  <input type="number" id="workout-distance" class="form-input" placeholder="5" min="0" step="0.1">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Notes</label>
                <input type="text" id="workout-notes" class="form-input" placeholder="Optional notes...">
              </div>
              <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
                <button type="button" class="btn btn-secondary" onclick="WorkoutPage.closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary" id="workout-submit-btn">Add Workout</button>
              </div>
            </form>
          </div>
        </div>
      </div>`;
  },

  toggleFields() {
    const cat = $('#workout-cat').value;
    $('#strength-fields').style.display = cat === 'strength' ? 'block' : 'none';
    $('#cardio-fields').style.display = ['cardio','hiit','sports'].includes(cat) ? 'block' : 'none';
  },

  openAddModal() {
    this.editing = null;
    $('#workout-modal-title').textContent = 'Add Workout';
    $('#workout-submit-btn').textContent = 'Add Workout';
    document.getElementById('workout-form').reset();
    this.toggleFields();
    $('#workout-modal').classList.add('active');
  },

  openEditModal(id) {
    const w = this.workouts.find(x => x._id === id);
    if (!w) return;
    this.editing = id;
    $('#workout-modal-title').textContent = 'Edit Workout';
    $('#workout-submit-btn').textContent = 'Update Workout';
    $('#workout-cat').value = w.category;
    $('#workout-name').value = w.name;
    $('#workout-dur').value = w.duration;
    $('#workout-cal-burned').value = w.caloriesBurned || '';
    $('#workout-intensity').value = w.intensity || 'moderate';
    $('#workout-sets').value = w.sets || '';
    $('#workout-reps').value = w.reps || '';
    $('#workout-weight').value = w.weight || '';
    $('#workout-distance').value = w.distance || '';
    $('#workout-notes').value = w.notes || '';
    this.toggleFields();
    $('#workout-modal').classList.add('active');
  },

  closeModal() { $('#workout-modal').classList.remove('active'); },

  async handleSubmit(e) {
    e.preventDefault();
    const btn = $('#workout-submit-btn');
    const data = {
      category: $('#workout-cat').value,
      name: $('#workout-name').value.trim(),
      duration: parseInt($('#workout-dur').value),
      caloriesBurned: parseFloat($('#workout-cal-burned').value) || 0,
      intensity: $('#workout-intensity').value,
      sets: parseInt($('#workout-sets').value) || undefined,
      reps: parseInt($('#workout-reps').value) || undefined,
      weight: parseFloat($('#workout-weight').value) || undefined,
      distance: parseFloat($('#workout-distance').value) || undefined,
      notes: $('#workout-notes').value.trim(),
      date: this.currentDate,
    };
    setLoading(btn, true);
    try {
      if (this.editing) {
        await api.put(`/workouts/${this.editing}`, data);
        Toast.show('Workout updated!', 'success');
      } else {
        await api.post('/workouts', data);
        Toast.show('Workout logged!', 'success');
      }
      this.closeModal();
      await this.loadData();
    } catch(e) {
      Toast.show(e.message, 'error');
    } finally {
      setLoading(btn, false);
    }
  },

  async deleteWorkout(id) {
    if (!confirm('Delete this workout?')) return;
    try {
      await api.delete(`/workouts/${id}`);
      Toast.show('Workout deleted', 'info');
      await this.loadData();
    } catch(e) { Toast.show(e.message, 'error'); }
  },

  exportData() {
    exportCSV(
      this.workouts,
      `workouts-${this.currentDate}.csv`,
      ['Date', 'Name', 'Category', 'Duration (min)', 'Calories Burned', 'Intensity'],
      w => [DateUtils.format(w.date), w.name, w.category, w.duration, w.caloriesBurned||0, w.intensity||'']
    );
  }
};
