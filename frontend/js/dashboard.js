const DashboardPage = {
  charts: {},

  async render() {
    const content = $('#page-content');
    const user = Auth.getUser();
    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Good ${this.getGreeting()}, ${user?.name?.split(' ')[0] || 'there'}! 👋</h1>
          <p class="page-subtitle">${new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}</p>
        </div>
        <input type="date" id="dash-date" class="form-input" value="${DateUtils.today()}" style="max-width:180px" onchange="DashboardPage.loadData()">
      </div>
      <div class="stats-grid" id="dash-stats">
        ${[1,2,3,4].map(() => `<div class="stat-card"><div class="skeleton" style="width:100%;height:60px"></div></div>`).join('')}
      </div>
      <div class="chart-grid">
        <div class="card">
          <div class="card-header"><span class="card-title">📊 Weekly Calories</span></div>
          <div class="card-body"><div class="chart-container"><canvas id="calories-chart"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">🏃 Weekly Workouts</span></div>
          <div class="card-body"><div class="chart-container"><canvas id="workout-chart"></canvas></div></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;flex-wrap:wrap">
        <div class="card">
          <div class="card-header">
            <span class="card-title">🥗 Today's Nutrition</span>
            <button class="btn btn-sm btn-primary" onclick="App.showPage('diet')">Add Meal</button>
          </div>
          <div class="card-body" id="dash-nutrition"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">💧 Water Intake</span>
            <button class="btn btn-sm btn-primary" onclick="App.showPage('water')">Log Water</button>
          </div>
          <div class="card-body" id="dash-water"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">📈 BMI & Goals</span>
            <button class="btn btn-sm btn-secondary" onclick="App.showPage('goals')">Details</button>
          </div>
          <div class="card-body" id="dash-bmi"></div>
        </div>
      </div>
    `;
    this.loadData();
  },

  getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  },

  async loadData() {
    const date = $('#dash-date')?.value || DateUtils.today();
    try {
      const [dietSum, workoutSum, waterSum, weeklyDiet, weeklyWorkout, profile] = await Promise.all([
        api.get(`/diet/summary?date=${date}`),
        api.get(`/workouts/summary?date=${date}`),
        api.get(`/water/summary?date=${date}`),
        api.get('/diet/weekly'),
        api.get('/workouts/weekly'),
        api.get('/users/profile'),
      ]);
      this.renderStats(dietSum.data, workoutSum.data, waterSum.data, profile.data);
      this.renderCharts(weeklyDiet.data, weeklyWorkout.data);
      this.renderNutrition(dietSum.data, profile.data);
      this.renderWater(waterSum.data, profile.data);
      this.renderBMI(profile.data);
    } catch(e) {
      Toast.show('Failed to load dashboard data', 'error');
    }
  },

  renderStats(diet, workout, water, user) {
    const calGoal = user?.dailyCalorieGoal || 2000;
    const waterGoal = user?.dailyWaterGoal || 2.5;
    const net = (diet?.totalCalories || 0) - (workout?.totalCaloriesBurned || 0);
    $('#dash-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-icon green">🔥</div>
        <div class="stat-info">
          <div class="stat-value">${Num.fmt(diet?.totalCalories || 0)}</div>
          <div class="stat-label">Calories Consumed</div>
          <div class="stat-change ${diet?.totalCalories <= calGoal ? 'up' : 'down'}">
            ${diet?.totalCalories <= calGoal ? '✓' : '⚠'} Goal: ${Num.fmt(calGoal)} kcal
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red">💪</div>
        <div class="stat-info">
          <div class="stat-value">${Num.fmt(workout?.totalCaloriesBurned || 0)}</div>
          <div class="stat-label">Calories Burned</div>
          <div class="stat-change up">${workout?.workoutCount || 0} workout${workout?.workoutCount !== 1 ? 's' : ''} today</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">💧</div>
        <div class="stat-info">
          <div class="stat-value">${Num.fmtDec(water?.totalAmount || 0)}L</div>
          <div class="stat-label">Water Intake</div>
          <div class="stat-change ${water?.totalAmount >= waterGoal ? 'up' : 'down'}">
            ${water?.totalAmount >= waterGoal ? '✓ Goal met' : `Goal: ${waterGoal}L`}
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">⚖️</div>
        <div class="stat-info">
          <div class="stat-value">${net >= 0 ? '+' : ''}${Num.fmt(net)}</div>
          <div class="stat-label">Net Calories</div>
          <div class="stat-change ${net <= 0 ? 'up' : 'down'}">${net <= 0 ? '✓ Deficit' : '⚠ Surplus'}</div>
        </div>
      </div>
    `;
  },

  renderCharts(weeklyDiet, weeklyWorkout) {
    const days = DateUtils.getLast7Days();
    const labels = days.map(d => DateUtils.getDayLabel(d));

    // Calories Chart
    if (this.charts.calories) this.charts.calories.destroy();
    const calCtx = document.getElementById('calories-chart');
    if (calCtx) {
      this.charts.calories = new Chart(calCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Calories',
            data: days.map(d => weeklyDiet[d]?.calories || 0),
            backgroundColor: 'rgba(0,208,132,0.7)',
            borderRadius: 8,
            borderSkipped: false,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text3') } },
            y: { grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--card-border') }, ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text3') } }
          }
        }
      });
    }

    // Workout Chart
    if (this.charts.workout) this.charts.workout.destroy();
    const wCtx = document.getElementById('workout-chart');
    if (wCtx) {
      this.charts.workout = new Chart(wCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Cal Burned',
            data: days.map(d => weeklyWorkout[d]?.caloriesBurned || 0),
            borderColor: '#ff6b6b',
            backgroundColor: 'rgba(255,107,107,0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#ff6b6b',
            pointRadius: 4,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text3') } },
            y: { grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--card-border') }, ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text3') } }
          }
        }
      });
    }
  },

  renderNutrition(diet, user) {
    const calGoal = user?.dailyCalorieGoal || 2000;
    const pct = Math.min(100, Math.round((diet?.totalCalories / calGoal) * 100)) || 0;
    const remaining = Math.max(0, calGoal - (diet?.totalCalories || 0));
    $('#dash-nutrition').innerHTML = `
      <div class="cal-ring-wrap">
        <div class="cal-ring">
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="76" fill="none" stroke="var(--bg3)" stroke-width="12"/>
            <circle cx="90" cy="90" r="76" fill="none" stroke="var(--primary)" stroke-width="12"
              stroke-dasharray="${2*Math.PI*76}" stroke-dashoffset="${2*Math.PI*76*(1-pct/100)}"
              stroke-linecap="round" style="transition:stroke-dashoffset 1s ease"/>
          </svg>
          <div class="cal-ring-text">
            <div class="cal-ring-num">${Num.fmt(diet?.totalCalories || 0)}</div>
            <div class="cal-ring-label">consumed</div>
            <div class="cal-ring-sub">${Num.fmt(remaining)} left</div>
          </div>
        </div>
      </div>
      <div class="macro-grid">
        <div class="macro-pill protein"><div class="macro-val">${Num.fmt(diet?.totalProtein || 0)}g</div><div class="macro-name">Protein</div></div>
        <div class="macro-pill carbs"><div class="macro-val">${Num.fmt(diet?.totalCarbs || 0)}g</div><div class="macro-name">Carbs</div></div>
        <div class="macro-pill fat"><div class="macro-val">${Num.fmt(diet?.totalFats || 0)}g</div><div class="macro-name">Fats</div></div>
        <div class="macro-pill cal"><div class="macro-val">${Num.fmt(diet?.logCount || 0)}</div><div class="macro-name">Entries</div></div>
      </div>
    `;
  },

  renderWater(water, user) {
    const goal = user?.dailyWaterGoal || 2.5;
    const amount = water?.totalAmount || 0;
    const pct = Math.min(100, Math.round((amount / goal) * 100));
    $('#dash-water').innerHTML = `
      <div class="water-display">
        <div class="water-circle" style="--pct:${pct*3.6}deg; background:conic-gradient(var(--accent3) ${pct*3.6}deg, var(--bg3) 0deg)">
          <div class="water-circle-inner">
            <div class="water-amount">${Num.fmtDec(amount)}</div>
            <div class="water-unit">of ${goal}L</div>
          </div>
        </div>
        <div class="progress-wrap" style="width:100%">
          <div class="progress-header">
            <span class="progress-label">Daily Goal</span>
            <span class="progress-value">${pct}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill blue" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="water-btns">
          <button class="water-btn" onclick="WaterPage.quickLog(0.25)">+250ml</button>
          <button class="water-btn" onclick="WaterPage.quickLog(0.5)">+500ml</button>
          <button class="water-btn" onclick="WaterPage.quickLog(1)">+1L</button>
        </div>
      </div>
    `;
  },

  renderBMI(user) {
    const bmi = user?.bmi;
    const cat = getBMICategory(bmi);
    const cls = getBMIClass(bmi);
    const goal = (user?.fitnessGoal || 'maintenance').replace(/_/g,' ');
    $('#dash-bmi').innerHTML = `
      <div class="bmi-display">
        <div class="bmi-value ${cls}">${bmi || '—'}</div>
        <div class="bmi-category ${cls}" style="margin:8px 0">${cat}</div>
        <div class="bmi-scale">
          <div class="bmi-scale-seg" style="background:rgba(116,192,252,0.5)"></div>
          <div class="bmi-scale-seg" style="background:rgba(0,208,132,0.5)"></div>
          <div class="bmi-scale-seg" style="background:rgba(255,169,77,0.5)"></div>
          <div class="bmi-scale-seg" style="background:rgba(255,107,107,0.5)"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-bottom:16px">
          <span>&lt;18.5</span><span>18.5-25</span><span>25-30</span><span>&gt;30</span>
        </div>
      </div>
      <div style="border-top:1px solid var(--card-border);padding-top:14px">
        <div style="font-size:12px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;font-weight:700;letter-spacing:0.5px">Fitness Goal</div>
        <div style="font-size:14px;font-weight:600;text-transform:capitalize">${goal}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:4px">Daily calorie target: ${Num.fmt(user?.dailyCalorieGoal || 2000)} kcal</div>
      </div>
    `;
  }
};
