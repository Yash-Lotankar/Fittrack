const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  age: { type: Number, min: 1, max: 120 },
  weight: { type: Number, min: 1 }, // kg
  height: { type: Number, min: 1 }, // cm
  gender: { type: String, enum: ['male', 'female', 'other'] },
  fitnessGoal: {
    type: String,
    enum: ['weight_loss', 'weight_gain', 'maintenance', 'muscle_building', 'endurance'],
    default: 'maintenance'
  },
  activityLevel: {
    type: String,
    enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'],
    default: 'moderately_active'
  },
  isAdmin: { type: Boolean, default: false },
  dailyCalorieGoal: { type: Number, default: 2000 },
  dailyWaterGoal: { type: Number, default: 2.5 }, // liters
  notifications: {
    water: { type: Boolean, default: true },
    workout: { type: Boolean, default: true },
    diet: { type: Boolean, default: true }
  },
  lastActive: { type: Date, default: Date.now }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Calculate BMI
userSchema.methods.getBMI = function() {
  if (!this.weight || !this.height) return null;
  const heightInM = this.height / 100;
  return (this.weight / (heightInM * heightInM)).toFixed(1);
};

// Calculate daily calorie needs (Mifflin-St Jeor)
userSchema.methods.calculateTDEE = function() {
  if (!this.weight || !this.height || !this.age) return 2000;
  let bmr;
  if (this.gender === 'male') {
    bmr = 10 * this.weight + 6.25 * this.height - 5 * this.age + 5;
  } else {
    bmr = 10 * this.weight + 6.25 * this.height - 5 * this.age - 161;
  }
  const activityMultipliers = {
    sedentary: 1.2, lightly_active: 1.375,
    moderately_active: 1.55, very_active: 1.725, extra_active: 1.9
  };
  const tdee = bmr * (activityMultipliers[this.activityLevel] || 1.55);
  const goalAdjustments = {
    weight_loss: -500, weight_gain: 500, muscle_building: 300,
    maintenance: 0, endurance: 200
  };
  return Math.round(tdee + (goalAdjustments[this.fitnessGoal] || 0));
};

userSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret.password; return ret; }
});

module.exports = mongoose.model('User', userSchema);
