// models/Route.js
const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  route_id: {
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
  origin: {
    type: {
      lat: Number,
      lng: Number
    },
    required: true
  },
  destination: {
    type: {
      lat: Number,
      lng: Number
    },
    required: true
  },
  recommended_route: {
    type: [[Number]], // array of [lng, lat]
    required: true
  },
  distance: {
    type: Number, // in km
    required: true
  },
  estimated_time: {
    type: Number, // in minutes
    required: true
  },
  avoided_roads: {
    type: [String], // road names or IDs
    default: []
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Indexes
routeSchema.index({ user_id: 1 });
routeSchema.index({ created_at: -1 });

module.exports = mongoose.model('Route', routeSchema);