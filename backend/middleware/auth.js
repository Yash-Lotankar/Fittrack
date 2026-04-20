const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Token is not valid' });
    }
    req.user = user;
    user.lastActive = new Date();
    await user.save({ validateBeforeSave: false });
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, async () => {
      if (!req.user.isAdmin) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }
      next();
    });
  } catch (err) {
    res.status(403).json({ success: false, message: 'Admin access required' });
  }
};

module.exports = { auth, adminAuth };
