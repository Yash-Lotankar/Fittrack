const DietLog = require('../models/DietLog');

const getDateRange = (dateStr) => {
  const date = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(date); end.setHours(23, 59, 59, 999);
  return { start, end };
};

// @GET /api/diet - Get diet logs (with date filter)
exports.getDietLogs = async (req, res) => {
  try {
    const { date, startDate, endDate, mealType, search, page = 1, limit = 50 } = req.query;
    const query = { user: req.user._id };

    if (date) {
      const { start, end } = getDateRange(date);
      query.date = { $gte: start, $lte: end };
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); query.date.$lte = e; }
    }
    if (mealType) query.mealType = mealType;
    if (search) query.foodName = { $regex: search, $options: 'i' };

    const logs = await DietLog.find(query)
      .sort({ date: -1, mealType: 1 })
      .skip((page - 1) * limit).limit(parseInt(limit));
    const total = await DietLog.countDocuments(query);

    res.json({ success: true, data: logs, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/diet - Add diet log
exports.addDietLog = async (req, res) => {
  try {
    const { foodName, calories, protein, carbs, fats, fiber, mealType, date, servingSize, notes } = req.body;
    if (!foodName || calories === undefined || !mealType) {
      return res.status(400).json({ success: false, message: 'foodName, calories, and mealType are required' });
    }
    const log = new DietLog({
      user: req.user._id, foodName, calories, protein, carbs, fats, fiber,
      mealType, date: date || new Date(), servingSize, notes
    });
    await log.save();
    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/diet/:id
exports.updateDietLog = async (req, res) => {
  try {
    const log = await DietLog.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!log) return res.status(404).json({ success: false, message: 'Log not found' });
    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @DELETE /api/diet/:id
exports.deleteDietLog = async (req, res) => {
  try {
    const log = await DietLog.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!log) return res.status(404).json({ success: false, message: 'Log not found' });
    res.json({ success: true, message: 'Log deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/diet/summary - Daily summary
exports.getDailySummary = async (req, res) => {
  try {
    const { date } = req.query;
    const { start, end } = getDateRange(date);
    const logs = await DietLog.find({ user: req.user._id, date: { $gte: start, $lte: end } });
    const summary = logs.reduce((acc, log) => {
      acc.totalCalories += log.calories || 0;
      acc.totalProtein += log.protein || 0;
      acc.totalCarbs += log.carbs || 0;
      acc.totalFats += log.fats || 0;
      acc.totalFiber += log.fiber || 0;
      acc.mealCounts[log.mealType] = (acc.mealCounts[log.mealType] || 0) + 1;
      return acc;
    }, { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0, totalFiber: 0, mealCounts: {} });
    res.json({ success: true, data: { ...summary, logCount: logs.length, date: date || new Date().toISOString().split('T')[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/diet/weekly - Weekly summary
exports.getWeeklySummary = async (req, res) => {
  try {
    const end = new Date(); end.setHours(23,59,59,999);
    const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0,0,0,0);
    const logs = await DietLog.find({ user: req.user._id, date: { $gte: start, $lte: end } });
    const daily = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      daily[key] = { calories: 0, protein: 0, carbs: 0, fats: 0 };
    }
    logs.forEach(log => {
      const key = new Date(log.date).toISOString().split('T')[0];
      if (daily[key]) {
        daily[key].calories += log.calories || 0;
        daily[key].protein += log.protein || 0;
        daily[key].carbs += log.carbs || 0;
        daily[key].fats += log.fats || 0;
      }
    });
    res.json({ success: true, data: daily });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
