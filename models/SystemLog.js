// models/SystemLog.js
const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  log_id: {
    type: String,
    unique: true,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ip_address: {
    type: String,
    trim: true
  }
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false }
});

// Indexes
systemLogSchema.index({ user_id: 1 });
systemLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('SystemLog', systemLogSchema);