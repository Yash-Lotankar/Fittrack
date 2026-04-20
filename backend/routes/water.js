const express = require('express');
const router = express.Router();
const { getWaterLogs, addWaterLog, deleteWaterLog, getDailySummary, getWeeklySummary } = require('../controllers/waterController');
const { auth } = require('../middleware/auth');

router.use(auth);
router.get('/summary', getDailySummary);
router.get('/weekly', getWeeklySummary);
router.get('/', getWaterLogs);
router.post('/', addWaterLog);
router.delete('/:id', deleteWaterLog);

module.exports = router;
