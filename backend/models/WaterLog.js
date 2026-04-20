const mongoose = require('mongoose');

const waterLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  amount: { type: Number, required: true, min: 0.1 }, // liters
  notes: { type: String, trim: true }
}, { timestamps: true });

waterLogSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('WaterLog', waterLogSchema);
