const Workout = require('../models/Workout');

const getDateRange = (dateStr) => {
  const date = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(date); end.setHours(23, 59, 59, 999);
  return { start, end };
};

// @GET /api/workouts
exports.getWorkouts = async (req, res) => {
  try {
    const { date, startDate, endDate, category, search, page = 1, limit = 50 } = req.query;
    const query = { user: req.user._id };
    if (date) {
      const { start, end } = getDateRange(date);
      query.date = { $gte: start, $lte: end };
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); query.date.$lte = e; }
    }
    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };
    const workouts = await Workout.find(query).sort({ date: -1 })
      .skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Workout.countDocuments(query);
    res.json({ success: true, data: workouts, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/workouts
exports.addWorkout = async (req, res) => {
  try {
    const { name, category, duration, caloriesBurned, sets, reps, weight, distance, intensity, date, notes } = req.body;
    if (!name || !category || !duration) {
      return res.status(400).json({ success: false, message: 'name, category, and duration are required' });
    }
    const workout = new Workout({
      user: req.user._id, name, category, duration, caloriesBurned,
      sets, reps, weight, distance, intensity, date: date || new Date(), notes
    });
    await workout.save();
    res.status(201).json({ success: true, data: workout });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/workouts/:id
exports.updateWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!workout) return res.status(404).json({ success: false, message: 'Workout not found' });
    res.json({ success: true, data: workout });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @DELETE /api/workouts/:id
exports.deleteWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!workout) return res.status(404).json({ success: false, message: 'Workout not found' });
    res.json({ success: true, message: 'Workout deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/workouts/summary
exports.getDailySummary = async (req, res) => {
  try {
    const { date } = req.query;
    const { start, end } = getDateRange(date);
    const workouts = await Workout.find({ user: req.user._id, date: { $gte: start, $lte: end } });
    const summary = workouts.reduce((acc, w) => {
      acc.totalCaloriesBurned += w.caloriesBurned || 0;
      acc.totalDuration += w.duration || 0;
      acc.categoryCounts[w.category] = (acc.categoryCounts[w.category] || 0) + 1;
      return acc;
    }, { totalCaloriesBurned: 0, totalDuration: 0, categoryCounts: {} });
    res.json({ success: true, data: { ...summary, workoutCount: workouts.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/workouts/weekly
exports.getWeeklySummary = async (req, res) => {
  try {
    const end = new Date(); end.setHours(23,59,59,999);
    const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0,0,0,0);
    const workouts = await Workout.find({ user: req.user._id, date: { $gte: start, $lte: end } });
    const daily = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      daily[d.toISOString().split('T')[0]] = { caloriesBurned: 0, duration: 0, count: 0 };
    }
    workouts.forEach(w => {
      const key = new Date(w.date).toISOString().split('T')[0];
      if (daily[key]) {
        daily[key].caloriesBurned += w.caloriesBurned || 0;
        daily[key].duration += w.duration || 0;
        daily[key].count++;
      }
    });
    res.json({ success: true, data: daily });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
