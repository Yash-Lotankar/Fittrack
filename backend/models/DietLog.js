const mongoose = require('mongoose');

const dietLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    required: true
  },
  foodName: { type: String, required: true, trim: true },
  calories: { type: Number, required: true, min: 0 },
  protein: { type: Number, default: 0, min: 0 },  // grams
  carbs: { type: Number, default: 0, min: 0 },     // grams
  fats: { type: Number, default: 0, min: 0 },      // grams
  fiber: { type: Number, default: 0, min: 0 },     // grams
  servingSize: { type: String, default: '1 serving' },
  notes: { type: String, trim: true }
}, { timestamps: true });

// Index for efficient date-based queries
dietLogSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('DietLog', dietLogSchema);
