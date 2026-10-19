// controllers/notificationController.js
const Notification = require('../models/Notification');

// ---- HTML page -------------------------------------------------------------
const getNotificationsPage = async (req, res) => {
  try {
    const notifications = await Notification.find({ user_id: req.user._id })
      .sort({ created_at: -1 })
      .limit(200)
      .lean();

    res.render('pages/notifications', {
      user: req.user,
      notifications,
      flash: null
    });
  } catch (err) {
    console.error('Notifications page error:', err);
    res.status(500).send('Error loading notifications: ' + err.message);
  }
};

// ---- JSON APIs -------------------------------------------------------------

// GET /api/notifications -> list (latest 50)
const apiList = async (req, res) => {
  try {
    const items = await Notification.find({ user_id: req.user._id })
      .sort({ created_at: -1 })
      .limit(50)
      .lean();
    res.json({ ok: true, count: items.length, notifications: items });
  } catch (err) {
    console.error('apiList error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

// GET /api/notifications/unread-count
const apiUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user_id: req.user._id,
      status: 'unread'
    });
    res.json({ ok: true, count });
  } catch (err) {
    console.error('apiUnreadCount error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

// POST /api/notifications/:id/read
const apiMarkRead = async (req, res) => {
  try {
    const { id } = req.params;
    const n = await Notification.findOneAndUpdate(
      { _id: id, user_id: req.user._id },
      { $set: { status: 'read' } },
      { new: true }
    );
    if (!n) return res.status(404).json({ ok: false, error: 'Notification not found' });
    res.json({ ok: true, notification: n });
  } catch (err) {
    console.error('apiMarkRead error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

// POST /api/notifications/read-all
const apiMarkAllRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user_id: req.user._id, status: 'unread' },
      { $set: { status: 'read' } }
    );
    res.json({ ok: true, modified: result.modifiedCount });
  } catch (err) {
    console.error('apiMarkAllRead error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

// POST /api/notifications/:id/delete
const apiDelete = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Notification.deleteOne({ _id: id, user_id: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ ok: false, error: 'Notification not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('apiDelete error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

module.exports = {
  getNotificationsPage,
  apiList,
  apiUnreadCount,
  apiMarkRead,
  apiMarkAllRead,
  apiDelete
};