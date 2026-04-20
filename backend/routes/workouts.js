const express = require('express');
const router = express.Router();
const { getWorkouts, addWorkout, updateWorkout, deleteWorkout, getDailySummary, getWeeklySummary } = require('../controllers/workoutController');
const { auth } = require('../middleware/auth');

router.use(auth);
router.get('/summary', getDailySummary);
router.get('/weekly', getWeeklySummary);
router.get('/', getWorkouts);
router.post('/', addWorkout);
router.put('/:id', updateWorkout);
router.delete('/:id', deleteWorkout);

module.exports = router;
