// models/RainfallData.js
const mongoose = require('mongoose');

const rainfallDataSchema = new mongoose.Schema({
  rainfall_id: {
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
  rainfall_amount: {
    type: Number,
    required: [true, 'Rainfall amount is required'],
    min: 0
  },
  measurement_date: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    enum: ['api', 'manual', 'prediction'],
    default: 'api'
  }
}, {
  timestamps: { createdAt: 'measurement_date', updatedAt: false }
});

// Indexes
rainfallDataSchema.index({ latitude: 1, longitude: 1 });
rainfallDataSchema.index({ measurement_date: -1 });

module.exports = mongoose.model('RainfallData', rainfallDataSchema);