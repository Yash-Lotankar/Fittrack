const express = require('express');
const router = express.Router();
const { getDietLogs, addDietLog, updateDietLog, deleteDietLog, getDailySummary, getWeeklySummary } = require('../controllers/dietController');
const { auth } = require('../middleware/auth');

router.use(auth);
router.get('/summary', getDailySummary);
router.get('/weekly', getWeeklySummary);
router.get('/', getDietLogs);
router.post('/', addDietLog);
router.put('/:id', updateDietLog);
router.delete('/:id', deleteDietLog);

module.exports = router;
