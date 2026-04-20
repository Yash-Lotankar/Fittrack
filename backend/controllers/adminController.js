const User = require('../models/User');
const DietLog = require('../models/DietLog');
const Workout = require('../models/Workout');
const WaterLog = require('../models/WaterLog');

// @GET /api/admin/stats
exports.getStats = async (req, res) => {
  try {
    const [totalUsers, totalDietLogs, totalWorkouts, totalWaterLogs] = await Promise.all([
      User.countDocuments({ isAdmin: false }),
      DietLog.countDocuments(),
      Workout.countDocuments(),
      WaterLog.countDocuments()
    ]);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await User.countDocuments({ lastActive: { $gte: thirtyDaysAgo }, isAdmin: false });
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      isAdmin: false
    });
    res.json({ success: true, data: { totalUsers, activeUsers, newUsersThisWeek, totalDietLogs, totalWorkouts, totalWaterLogs } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/admin/users
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = { isAdmin: false };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
    const users = await User.find(query).sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(parseInt(limit));
    const total = await User.countDocuments(query);
    res.json({ success: true, data: users, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/admin/users/:id
exports.getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const [dietCount, workoutCount, waterCount] = await Promise.all([
      DietLog.countDocuments({ user: user._id }),
      Workout.countDocuments({ user: user._id }),
      WaterLog.countDocuments({ user: user._id })
    ]);
    res.json({ success: true, data: { user, stats: { dietCount, workoutCount, waterCount } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isAdmin) return res.status(400).json({ success: false, message: 'Cannot delete admin' });
    await Promise.all([
      User.findByIdAndDelete(req.params.id),
      DietLog.deleteMany({ user: req.params.id }),
      Workout.deleteMany({ user: req.params.id }),
      WaterLog.deleteMany({ user: req.params.id })
    ]);
    res.json({ success: true, message: 'User and all data deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/admin/users/:id
exports.updateUser = async (req, res) => {
  try {
    const allowedFields = ['name', 'email', 'age', 'weight', 'height', 'fitnessGoal'];
    const updates = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/admin/create-admin
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, adminSecret } = req.body;
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ success: false, message: 'Invalid admin secret' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });
    const admin = new User({ name, email, password, isAdmin: true });
    await admin.save();
    res.status(201).json({ success: true, message: 'Admin created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
