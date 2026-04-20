const WaterLog = require('../models/WaterLog');

const getDateRange = (dateStr) => {
  const date = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(date); end.setHours(23, 59, 59, 999);
  return { start, end };
};

// @GET /api/water
exports.getWaterLogs = async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    const query = { user: req.user._id };
    if (date) {
      const { start, end } = getDateRange(date);
      query.date = { $gte: start, $lte: end };
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); query.date.$lte = e; }
    }
    const logs = await WaterLog.find(query).sort({ date: -1 });
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/water
exports.addWaterLog = async (req, res) => {
  try {
    const { amount, date, notes } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }
    const log = new WaterLog({ user: req.user._id, amount, date: date || new Date(), notes });
    await log.save();
    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @DELETE /api/water/:id
exports.deleteWaterLog = async (req, res) => {
  try {
    const log = await WaterLog.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!log) return res.status(404).json({ success: false, message: 'Log not found' });
    res.json({ success: true, message: 'Water log deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/water/summary
exports.getDailySummary = async (req, res) => {
  try {
    const { date } = req.query;
    const { start, end } = getDateRange(date);
    const logs = await WaterLog.find({ user: req.user._id, date: { $gte: start, $lte: end } });
    const totalAmount = logs.reduce((sum, l) => sum + l.amount, 0);
    res.json({ success: true, data: { totalAmount: Math.round(totalAmount * 10) / 10, logCount: logs.length, logs } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/water/weekly
exports.getWeeklySummary = async (req, res) => {
  try {
    const end = new Date(); end.setHours(23,59,59,999);
    const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0,0,0,0);
    const logs = await WaterLog.find({ user: req.user._id, date: { $gte: start, $lte: end } });
    const daily = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      daily[d.toISOString().split('T')[0]] = 0;
    }
    logs.forEach(l => {
      const key = new Date(l.date).toISOString().split('T')[0];
      if (daily[key] !== undefined) daily[key] += l.amount;
    });
    Object.keys(daily).forEach(k => { daily[k] = Math.round(daily[k] * 10) / 10; });
    res.json({ success: true, data: daily });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
