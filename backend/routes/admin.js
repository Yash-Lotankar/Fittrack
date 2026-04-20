const express = require('express');
const router = express.Router();
const { getStats, getUsers, getUserDetail, deleteUser, updateUser, createAdmin } = require('../controllers/adminController');
const { adminAuth } = require('../middleware/auth');

router.post('/create-admin', createAdmin);
router.use(adminAuth);
router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/users/:id', getUserDetail);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
