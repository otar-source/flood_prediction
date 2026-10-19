// models/FloodPrediction.js
const mongoose = require('mongoose');

const floodPredictionSchema = new mongoose.Schema({
  prediction_id: {
    type: String,
    unique: true,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  risk_level: {
    type: String,
    enum: ['Low', 'Moderate', 'High'],
    required: true
  },
  rainfall_value: {
    type: Number,
    required: true,
    min: 0
  },
  prediction_date: {
    type: Date,
    default: Date.now
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 70
  }
}, {
  timestamps: { createdAt: 'prediction_date', updatedAt: false }
});

// Indexes
floodPredictionSchema.index({ latitude: 1, longitude: 1 });
floodPredictionSchema.index({ risk_level: 1 });

module.exports = mongoose.model('FloodPrediction', floodPredictionSchema);