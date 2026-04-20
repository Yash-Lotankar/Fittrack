# 🏋️ FitTrack — Full-Stack Fitness & Diet Tracking App

A production-ready, full-stack web application for tracking fitness, diet, workouts, and water intake — built with Node.js, Express, MongoDB, and vanilla HTML/CSS/JS.

---

## 📁 Project Structure

```
fittrack/
├── backend/
│   ├── controllers/
│   │   ├── authController.js       # Register, login, profile
│   │   ├── dietController.js       # Meal CRUD + summaries
│   │   ├── workoutController.js    # Workout CRUD + summaries
│   │   ├── waterController.js      # Water log CRUD + summaries
│   │   └── adminController.js      # Admin: user management, stats
│   ├── middleware/
│   │   └── auth.js                 # JWT auth + admin guard
│   ├── models/
│   │   ├── User.js                 # User schema (bcrypt, BMI, TDEE)
│   │   ├── DietLog.js              # Diet entry schema
│   │   ├── Workout.js              # Workout entry schema
│   │   └── WaterLog.js             # Water intake schema
│   ├── routes/
│   │   ├── auth.js                 # /api/auth/*
│   │   ├── users.js                # /api/users/*
│   │   ├── diet.js                 # /api/diet/*
│   │   ├── workouts.js             # /api/workouts/*
│   │   ├── water.js                # /api/water/*
│   │   └── admin.js                # /api/admin/*
│   ├── server.js                   # Express app entry point
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── css/
    │   └── style.css               # Full responsive stylesheet
    ├── js/
    │   ├── utils.js                # API helper, Auth, Toast, DateUtils
    │   ├── app.js                  # Router, App controller, AuthPage
    │   ├── dashboard.js            # Dashboard + charts
    │   ├── diet.js                 # Diet tracker page
    │   ├── workout.js              # Workout tracker page
    │   └── pages.js                # Water, Goals, Profile, Admin pages
    └── index.html                  # Single-page app entry
```

---

## ⚙️ Setup Instructions

### Prerequisites
- **Node.js** v16+ 
- **MongoDB** (local: `mongodb://localhost:27017` or MongoDB Atlas)

### 1. Clone / Extract the project

### 2. Backend Setup

```bash
cd fittrack/backend

# Install dependencies
npm install

# Copy env file and configure
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fittrack
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
ADMIN_SECRET=fittrack_admin_secret_2024
```

### 3. Start the Backend

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server starts at: `http://localhost:5000`

### 4. Frontend Setup

The frontend is **pure HTML/CSS/JS** — no build step needed.

**Option A: Open directly**
```bash
open fittrack/frontend/index.html
```
> ⚠️ Some browsers block fetch requests from file://. Use Option B for best results.

**Option B: Serve with a static server**
```bash
# Using npx serve
npx serve fittrack/frontend

# Or using Python
cd fittrack/frontend && python3 -m http.server 3000
```

Frontend runs at: `http://localhost:3000`

> **Note**: If frontend and backend are on different ports, CORS is already enabled in the backend. Make sure `API_BASE` in `frontend/js/utils.js` points to `http://localhost:5000/api`.

---

## 🔐 Creating an Admin Account

POST `http://localhost:5000/api/admin/create-admin` with:
```json
{
  "name": "Admin User",
  "email": "admin@fittrack.com",
  "password": "admin123",
  "adminSecret": "fittrack_admin_secret_2024"
}
```

Or use curl:
```bash
curl -X POST http://localhost:5000/api/admin/create-admin \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@fittrack.com","password":"admin123","adminSecret":"fittrack_admin_secret_2024"}'
```

---

## 📡 API Endpoints Reference

### Auth — `/api/auth`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | ❌ | Register new user |
| POST | `/login` | ❌ | Login and get JWT |
| GET | `/me` | ✅ | Get current user |
| PUT | `/update-profile` | ✅ | Update profile |
| PUT | `/change-password` | ✅ | Change password |

### Users — `/api/users`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/profile` | ✅ | Get profile with BMI & TDEE |
| GET | `/bmi` | ✅ | Get BMI & category |

### Diet — `/api/diet`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ | Get diet logs (filter: date, mealType, search) |
| POST | `/` | ✅ | Add meal entry |
| PUT | `/:id` | ✅ | Update meal entry |
| DELETE | `/:id` | ✅ | Delete meal entry |
| GET | `/summary` | ✅ | Daily nutrition summary |
| GET | `/weekly` | ✅ | Last 7 days breakdown |

**Query params**: `?date=2024-01-15`, `?mealType=breakfast`, `?search=chicken`, `?startDate=&endDate=`

### Workouts — `/api/workouts`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ | Get workouts (filter: date, category, search) |
| POST | `/` | ✅ | Log workout |
| PUT | `/:id` | ✅ | Update workout |
| DELETE | `/:id` | ✅ | Delete workout |
| GET | `/summary` | ✅ | Daily workout summary |
| GET | `/weekly` | ✅ | Last 7 days breakdown |

### Water — `/api/water`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ | Get water logs |
| POST | `/` | ✅ | Log water intake |
| DELETE | `/:id` | ✅ | Delete water log |
| GET | `/summary` | ✅ | Daily water summary |
| GET | `/weekly` | ✅ | Last 7 days intake |

### Admin — `/api/admin` (Admin JWT required)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/create-admin` | Secret | Create admin account |
| GET | `/stats` | 🔐 | Platform analytics |
| GET | `/users` | 🔐 | List all users |
| GET | `/users/:id` | 🔐 | User detail + stats |
| PUT | `/users/:id` | 🔐 | Update user |
| DELETE | `/users/:id` | 🔐 | Delete user + all data |

---

## 🗄️ MongoDB Collections

### Users
```js
{ name, email, password (hashed), age, weight, height, gender,
  fitnessGoal, activityLevel, isAdmin, dailyCalorieGoal,
  dailyWaterGoal, notifications, lastActive, createdAt }
```

### DietLogs
```js
{ user (ref), date, mealType, foodName, calories, protein,
  carbs, fats, fiber, servingSize, notes, createdAt }
```

### Workouts
```js
{ user (ref), date, name, category, duration, caloriesBurned,
  sets, reps, weight, distance, intensity, notes, createdAt }
```

### WaterLogs
```js
{ user (ref), date, amount, notes, createdAt }
```

---

## ✨ Features

| Feature | Status |
|---------|--------|
| JWT Authentication | ✅ |
| Password hashing (bcrypt) | ✅ |
| Dashboard with charts | ✅ |
| Diet tracker (CRUD) | ✅ |
| Workout tracker (CRUD) | ✅ |
| Water intake tracker | ✅ |
| BMI calculator | ✅ |
| TDEE / calorie suggestion | ✅ |
| Weekly progress charts | ✅ |
| Dark mode | ✅ |
| Push notifications (in-app) | ✅ |
| Search & filter | ✅ |
| CSV export | ✅ |
| Admin panel | ✅ |
| Mobile responsive | ✅ |
| Goals editor | ✅ |

---

## 🎨 Tech Stack

- **Frontend**: HTML5, CSS3 (custom, no framework), Vanilla JS, Chart.js
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Auth**: JWT + bcryptjs
- **Fonts**: Clash Display + Plus Jakarta Sans (Google Fonts)

---

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5000 | Server port |
| MONGODB_URI | mongodb://localhost:27017/fittrack | MongoDB connection |
| JWT_SECRET | — | Secret for JWT signing |
| JWT_EXPIRE | 7d | JWT expiry duration |
| NODE_ENV | development | Environment |
| ADMIN_SECRET | — | Secret to create admin accounts |

---

## 💡 Tips

- **CORS**: Already configured for development. For production, restrict origins in `server.js`.
- **MongoDB Atlas**: Replace `MONGODB_URI` with your Atlas connection string.
- **Serving Together**: You can serve the frontend from Express by updating `server.js`:
  ```js
  app.use(express.static(path.join(__dirname, '../frontend')));
  ```
- **Dark Mode**: Click the 🌙 moon icon in the top right.
- **Notifications**: Click the 🔔 bell for daily reminders (water, workout, diet).
