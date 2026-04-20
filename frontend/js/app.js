// ===== APP CONTROLLER =====
const App = {
  currentPage: null,

  init() {
    Theme.init();
    if (Auth.isLoggedIn()) {
      this.showPage('dashboard');
      this.checkNotifications();
    } else {
      this.showPage('login');
    }
    this.bindGlobalEvents();
  },

  showPage(page) {
    this.currentPage = page;
    const isAuth = ['login', 'register'].includes(page);
    $('#auth-wrapper').style.display = isAuth ? 'flex' : 'none';
    $('#app-wrapper').style.display = isAuth ? 'none' : 'flex';

    if (!isAuth) {
      this.renderSidebar();
      this.updateActiveNav(page);
      this.loadPage(page);
    } else {
      if (page === 'login') AuthPage.renderLogin();
      else AuthPage.renderRegister();
    }
  },

  renderSidebar() {
    const user = Auth.getUser();
    if (!user) return;
    const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
    $('#sidebar-username').textContent = user.name || 'User';
    $('#sidebar-useremail').textContent = user.email || '';
    $('#sidebar-avatar').textContent = initial;
    if (user.isAdmin) {
      $('#admin-nav-item').style.display = 'flex';
    }
  },

  updateActiveNav(page) {
    $$('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
  },

  loadPage(page) {
    const title = {
      dashboard: 'Dashboard', diet: 'Diet Tracker', workout: 'Workout Tracker',
      water: 'Water Intake', goals: 'Goals & Progress', profile: 'My Profile', admin: 'Admin Panel'
    };
    $('#topbar-title').textContent = title[page] || 'FitTrack';
    const content = $('#page-content');
    content.innerHTML = '<div class="empty-state"><div class="skeleton" style="height:200px;border-radius:16px"></div></div>';

    switch(page) {
      case 'dashboard': DashboardPage.render(); break;
      case 'diet': DietPage.render(); break;
      case 'workout': WorkoutPage.render(); break;
      case 'water': WaterPage.render(); break;
      case 'goals': GoalsPage.render(); break;
      case 'profile': ProfilePage.render(); break;
      case 'admin': AdminPage.render(); break;
    }
  },

  bindGlobalEvents() {
    // Theme toggle
    $$('.theme-toggle').forEach(btn => btn.addEventListener('click', () => Theme.toggle()));
    // Sidebar nav
    $$('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        if (page === 'logout') { this.logout(); return; }
        this.showPage(page);
        this.closeSidebar();
      });
    });
    // Hamburger
    $('#hamburger-btn')?.addEventListener('click', () => this.toggleSidebar());
    $('#sidebar-overlay')?.addEventListener('click', () => this.closeSidebar());
    // Notification button
    $('#notification-btn')?.addEventListener('click', () => this.showNotifications());
  },

  toggleSidebar() {
    $('#sidebar').classList.toggle('open');
    $('#sidebar-overlay').classList.toggle('visible');
  },

  closeSidebar() {
    $('#sidebar').classList.remove('open');
    $('#sidebar-overlay').classList.remove('visible');
  },

  logout() {
    Auth.clear();
    Toast.show('Logged out successfully', 'info');
    this.showPage('login');
  },

  async checkNotifications() {
    try {
      const user = Auth.getUser();
      if (!user) return;
      const notifs = [];
      const waterSummary = await api.get(`/water/summary?date=${DateUtils.today()}`);
      if (waterSummary.data.totalAmount < (user.dailyWaterGoal || 2.5) * 0.5) {
        notifs.push("💧 You haven't logged enough water today!");
      }
      const workoutSummary = await api.get(`/workouts/summary?date=${DateUtils.today()}`);
      if (workoutSummary.data.workoutCount === 0) {
        notifs.push("🏋️ No workout logged today. Stay active!");
      }
      const dietSummary = await api.get(`/diet/summary?date=${DateUtils.today()}`);
      if (dietSummary.data.totalCalories === 0) {
        notifs.push("🥗 You haven't logged any meals today!");
      }
      this._pendingNotifications = notifs;
      if (notifs.length > 0) $('#notif-dot')?.style.setProperty('display','block');
    } catch (e) {}
  },

  showNotifications() {
    const notifs = this._pendingNotifications || [];
    if (!notifs.length) { Toast.show('No new notifications', 'info'); return; }
    notifs.forEach((n, i) => setTimeout(() => Toast.show(n, 'warning', 6000), i * 400));
    this._pendingNotifications = [];
    $('#notif-dot')?.style.setProperty('display','none');
  }
};

// ===== AUTH PAGE =====
const AuthPage = {
  renderLogin() {
    $('#auth-content').innerHTML = `
      <div class="auth-container">
        <div class="auth-logo">
          <div class="logo-icon">🏋️</div>
          <span>FitTrack</span>
        </div>
        <h1 class="auth-title">Welcome back</h1>
        <p class="auth-subtitle">Log in to continue your fitness journey</p>
        <div class="auth-tabs">
          <button class="auth-tab active" onclick="AuthPage.renderLogin()">Login</button>
          <button class="auth-tab" onclick="AuthPage.renderRegister()">Sign Up</button>
        </div>
        <form id="login-form" onsubmit="AuthPage.handleLogin(event)">
          <div class="form-group">
            <label class="form-label">Email</label>
            <div class="input-wrapper">
              <span class="input-icon">📧</span>
              <input type="email" id="login-email" class="form-input" placeholder="you@example.com" required>
            </div>
            <span class="form-error"></span>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input type="password" id="login-password" class="form-input" placeholder="••••••••" required>
            </div>
            <span class="form-error"></span>
          </div>
          <button type="submit" class="btn btn-primary btn-full" id="login-btn">Login</button>
        </form>
        <div style="text-align:center;margin-top:20px;font-size:13px;color:var(--text3)">
          Don't have an account? <a href="#" onclick="AuthPage.renderRegister()" style="color:var(--primary);font-weight:600">Sign up</a>
        </div>
        <div style="text-align:center;margin-top:12px;font-size:12px;color:var(--text3)">
          Admin? <a href="#" onclick="AuthPage.renderAdminLogin()" style="color:var(--accent3)">Admin Login</a>
        </div>
      </div>`;
  },

  renderRegister() {
    $('#auth-content').innerHTML = `
      <div class="auth-container">
        <div class="auth-logo">
          <div class="logo-icon">🏋️</div>
          <span>FitTrack</span>
        </div>
        <h1 class="auth-title">Create account</h1>
        <p class="auth-subtitle">Start your fitness journey today</p>
        <div class="auth-tabs">
          <button class="auth-tab" onclick="AuthPage.renderLogin()">Login</button>
          <button class="auth-tab active" onclick="AuthPage.renderRegister()">Sign Up</button>
        </div>
        <form id="register-form" onsubmit="AuthPage.handleRegister(event)">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" id="reg-name" class="form-input" placeholder="John Doe" required>
            <span class="form-error"></span>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="reg-email" class="form-input" placeholder="you@example.com" required>
            <span class="form-error"></span>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="reg-password" class="form-input" placeholder="Min 6 characters" required>
            <span class="form-error"></span>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Age</label>
              <input type="number" id="reg-age" class="form-input" placeholder="25" min="1" max="120">
            </div>
            <div class="form-group">
              <label class="form-label">Gender</label>
              <select id="reg-gender" class="form-select">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Weight (kg)</label>
              <input type="number" id="reg-weight" class="form-input" placeholder="70" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">Height (cm)</label>
              <input type="number" id="reg-height" class="form-input" placeholder="175" min="1">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Fitness Goal</label>
            <select id="reg-goal" class="form-select">
              <option value="maintenance">Maintenance</option>
              <option value="weight_loss">Weight Loss</option>
              <option value="weight_gain">Weight Gain</option>
              <option value="muscle_building">Muscle Building</option>
              <option value="endurance">Endurance</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary btn-full" id="register-btn">Create Account</button>
        </form>
        <div style="text-align:center;margin-top:20px;font-size:13px;color:var(--text3)">
          Already have an account? <a href="#" onclick="AuthPage.renderLogin()" style="color:var(--primary);font-weight:600">Log in</a>
        </div>
      </div>`;
  },

  renderAdminLogin() {
    $('#auth-content').innerHTML = `
      <div class="auth-container">
        <div class="auth-logo">
          <div class="logo-icon">🔐</div>
          <span>Admin Login</span>
        </div>
        <h1 class="auth-title">Admin Access</h1>
        <p class="auth-subtitle">Enter admin credentials to continue</p>
        <form id="admin-login-form" onsubmit="AuthPage.handleLogin(event)">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="login-email" class="form-input" placeholder="admin@fittrack.com" required>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="login-password" class="form-input" placeholder="••••••••" required>
          </div>
          <button type="submit" class="btn btn-primary btn-full" id="login-btn">Login as Admin</button>
        </form>
        <div style="text-align:center;margin-top:16px;font-size:13px">
          <a href="#" onclick="AuthPage.renderLogin()" style="color:var(--text3)">← Back to Login</a>
        </div>
      </div>`;
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    const btn = $('#login-btn');
    setLoading(btn, true);
    try {
      const res = await api.post('/auth/login', { email, password });
      Auth.setAuth(res.token, res.user);
      Toast.show(`Welcome back, ${res.user.name}! 👋`, 'success');
      App.showPage(res.user.isAdmin ? 'admin' : 'dashboard');
    } catch (err) {
      Toast.show(err.message || 'Login failed', 'error');
    } finally {
      setLoading(btn, false);
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const btn = $('#register-btn');
    const data = {
      name: $('#reg-name').value.trim(),
      email: $('#reg-email').value.trim(),
      password: $('#reg-password').value,
      age: parseInt($('#reg-age').value) || undefined,
      gender: $('#reg-gender').value || undefined,
      weight: parseFloat($('#reg-weight').value) || undefined,
      height: parseFloat($('#reg-height').value) || undefined,
      fitnessGoal: $('#reg-goal').value,
    };
    if (!data.name || !data.email || !data.password) { Toast.show('Please fill required fields', 'error'); return; }
    if (!Validate.email(data.email)) { Toast.show('Invalid email address', 'error'); return; }
    if (data.password.length < 6) { Toast.show('Password must be at least 6 characters', 'error'); return; }
    setLoading(btn, true);
    try {
      const res = await api.post('/auth/register', data);
      Auth.setAuth(res.token, res.user);
      Toast.show(`Welcome to FitTrack, ${res.user.name}! 🎉`, 'success');
      App.showPage('dashboard');
    } catch (err) {
      Toast.show(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(btn, false);
    }
  }
};

// ===== START APP =====
document.addEventListener('DOMContentLoaded', () => App.init());
