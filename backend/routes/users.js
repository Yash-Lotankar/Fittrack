const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

// @GET /api/users/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const bmi = user.getBMI();
    const tdee = user.calculateTDEE();
    res.json({ success: true, data: { ...user.toJSON(), bmi, tdee } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/users/bmi
router.get('/bmi', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const bmi = user.getBMI();
    let category = '';
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi < 25) category = 'Normal weight';
    else if (bmi < 30) category = 'Overweight';
    else category = 'Obese';
    res.json({ success: true, data: { bmi, category } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
