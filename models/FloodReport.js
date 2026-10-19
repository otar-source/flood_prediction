// models/FloodReport.js
const mongoose = require('mongoose');

const floodReportSchema = new mongoose.Schema({
  report_id: {
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
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  latitude: {
    type: Number,
    required: [true, 'Latitude is required'],
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: [true, 'Longitude is required'],
    min: -180,
    max: 180
  },
  road_name: {
    type: String,
    trim: true
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    required: [true, 'Severity is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  image_url: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  reported_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'reported_at', updatedAt: false }
});

// Indexes
floodReportSchema.index({ latitude: 1, longitude: 1 });
floodReportSchema.index({ status: 1 });
floodReportSchema.index({ user_id: 1 });

module.exports = mongoose.model('FloodReport', floodReportSchema);