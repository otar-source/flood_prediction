// models/Road.js
const mongoose = require('mongoose');

const roadSchema = new mongoose.Schema({
  road_id: {
    type: String,
    unique: true,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  road_name: {
    type: String,
    required: [true, 'Road name is required'],
    trim: true,
    unique: true
  },
  start_point: {
    type: {
      lat: Number,
      lng: Number
    },
    required: true
  },
  end_point: {
    type: {
      lat: Number,
      lng: Number
    },
    required: true
  },
  coordinates: {
    type: [[Number]], // array of [lng, lat] for polyline
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'affected', 'closed'],
    default: 'open'
  },
  flood_risk: {
    type: String,
    enum: ['Low', 'Moderate', 'High'],
    default: 'Low'
  }
}, {
  timestamps: true
});

// Indexes
roadSchema.index({ status: 1 });

module.exports = mongoose.model('Road', roadSchema);