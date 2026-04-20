const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['cardio', 'strength', 'yoga', 'hiit', 'sports', 'flexibility', 'other'],
    required: true
  },
  duration: { type: Number, required: true, min: 1 }, // minutes
  caloriesBurned: { type: Number, default: 0, min: 0 },
  sets: { type: Number },
  reps: { type: Number },
  weight: { type: Number }, // kg (for strength)
  distance: { type: Number }, // km (for cardio)
  intensity: {
    type: String,
    enum: ['low', 'moderate', 'high', 'very_high'],
    default: 'moderate'
  },
  notes: { type: String, trim: true }
}, { timestamps: true });

workoutSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Workout', workoutSchema);
