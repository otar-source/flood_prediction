// seed.js
// Seeds the flood_safe_routes DB with:
//   - 1 admin + 5 regular users
//   - 10 connected Port Harcourt roads (graph for Dijkstra)
//   - 8 flood reports at real PH locations (mixed severity + status)
//   - 8 rainfall records (one per monitored location)
//   - 2 flood predictions (one Moderate, one High)
//   - A few system logs for demo
//
// Safe to re-run: it wipes the affected collections first.

require('dotenv').config();
const connectDB = require('./config/db');
const bcrypt = require('bcryptjs');

const User              = require('./models/User');
const Road              = require('./models/Road');
const FloodReport       = require('./models/FloodReport');
const RainfallData      = require('./models/RainfallData');
const FloodPrediction   = require('./models/FloodPrediction');
const SystemLog         = require('./models/SystemLog');
const Notification      = require('./models/Notification');
const Route             = require('./models/Route');

const MONITORED = require('./config/monitoredLocations');

const seed = async () => {
  try {
    await connectDB();

    await Promise.all([
      User.deleteMany({}),
      Road.deleteMany({}),
      FloodReport.deleteMany({}),
      RainfallData.deleteMany({}),
      FloodPrediction.deleteMany({}),
      SystemLog.deleteMany({}),
      Notification.deleteMany({}),
      Route.deleteMany({})
    ]);
    console.log('Cleared existing collections.');

    const pw = async (p) => bcrypt.hash(p, 10);

    const [admin, u1, u2, u3, u4, u5] = await User.create([
      {
        name: 'System Admin',
        email: 'admin@flood.local',
        password_hash: await pw('Admin123!'),
        role: 'admin',
        phone: '08011111111',
        status: 'active'
      },
      {
        name: 'Chidi Okonkwo',
        email: 'chidi@example.com',
        password_hash: await pw('User123!'),
        role: 'user',
        phone: '08022222222',
        status: 'active'
      },
      {
        name: 'Amaka Eze',
        email: 'amaka@example.com',
        password_hash: await pw('User123!'),
        role: 'user',
        phone: '08033333333',
        status: 'active'
      },
      {
        name: 'Tunde Balogun',
        email: 'tunde@example.com',
        password_hash: await pw('User123!'),
        role: 'user',
        phone: '08044444444',
        status: 'active'
      },
      {
        name: 'Ngozi Amadi',
        email: 'ngozi@example.com',
        password_hash: await pw('User123!'),
        role: 'user',
        phone: '08055555555',
        status: 'active'
      },
      {
        name: 'Emeka Obi',
        email: 'emeka@example.com',
        password_hash: await pw('User123!'),
        role: 'user',
        phone: '08066666666',
        status: 'inactive'   // demonstrates the "inactive user" flow
      }
    ]);
    console.log('Seeded 6 users (1 admin, 5 regular).');

    const roadsData = [
      { road_name: 'Aba Road',
        start_point:{lat:4.8150,lng:7.0498}, end_point:{lat:4.8000,lng:7.0300},
        coordinates:[[7.0498,4.8150],[7.0400,4.8075],[7.0300,4.8000]],
        status:'open', flood_risk:'Low' },
      { road_name: 'East-West Road',
        start_point:{lat:4.8000,lng:7.0300}, end_point:{lat:4.7900,lng:6.9900},
        coordinates:[[7.0300,4.8000],[7.0100,4.7950],[6.9900,4.7900]],
        status:'open', flood_risk:'Moderate' },
      { road_name: 'Trans-Amadi Road',
        start_point:{lat:4.8150,lng:7.0498}, end_point:{lat:4.8050,lng:7.0600},
        coordinates:[[7.0498,4.8150],[7.0550,4.8100],[7.0600,4.8050]],
        status:'open', flood_risk:'Low' },
      { road_name: 'Ikwerre Road',
        start_point:{lat:4.8150,lng:7.0498}, end_point:{lat:4.8100,lng:7.0100},
        coordinates:[[7.0498,4.8150],[7.0300,4.8125],[7.0100,4.8100]],
        status:'open', flood_risk:'Low' },
      { road_name: 'Olu-Obasanjo Road',
        start_point:{lat:4.8150,lng:7.0498}, end_point:{lat:4.7800,lng:7.0450},
        coordinates:[[7.0498,4.8150],[7.0475,4.7975],[7.0450,4.7800]],
        status:'open', flood_risk:'High' },              // excluded by Dijkstra
      { road_name: 'Rumuokwuta Road',
        start_point:{lat:4.8000,lng:7.0300}, end_point:{lat:4.8300,lng:7.0700},
        coordinates:[[7.0300,4.8000],[7.0500,4.8150],[7.0700,4.8300]],
        status:'open', flood_risk:'Low' },
      { road_name: 'Adaka Boro Road',
        start_point:{lat:4.8050,lng:7.0600}, end_point:{lat:4.7800,lng:7.0450},
        coordinates:[[7.0600,4.8050],[7.0525,4.7925],[7.0450,4.7800]],
        status:'open', flood_risk:'Moderate' },
      { road_name: 'Nwolu Road',
        start_point:{lat:4.7800,lng:7.0450}, end_point:{lat:4.8100,lng:7.0100},
        coordinates:[[7.0450,4.7800],[7.0275,4.7950],[7.0100,4.8100]],
        status:'open', flood_risk:'Low' },
      { road_name: 'Woji Road',
        start_point:{lat:4.8050,lng:7.0600}, end_point:{lat:4.8300,lng:7.0700},
        coordinates:[[7.0600,4.8050],[7.0650,4.8175],[7.0700,4.8300]],
        status:'open', flood_risk:'Low' },
      { road_name: 'Choba Road',
        start_point:{lat:4.8300,lng:7.0700}, end_point:{lat:4.8900,lng:6.9000},
        coordinates:[[7.0700,4.8300],[6.9850,4.8600],[6.9000,4.8900]],
        status:'open', flood_risk:'Low' }
    ];
    await Road.insertMany(roadsData);
    console.log(`Seeded ${roadsData.length} roads (connected graph).`);

    // ---------- flood reports ----------
    // 8 reports at real Port Harcourt locations, mixed severity + status.
    const reportsData = [
      { user_id: u1._id, location: 'Aba Road, Port Harcourt',
        road_name: 'Aba Road', severity: 'High',
        description: 'Road submerged near Garrison bus stop, cars stalling.',
        latitude: 4.8150, longitude: 7.0498, status: 'verified' },
      { user_id: u2._id, location: 'Rumuokwuta Junction',
        road_name: 'Rumuokwuta Road', severity: 'Medium',
        description: 'Knee-deep water, traffic slowing. Passable with care.',
        latitude: 4.8250, longitude: 7.0250, status: 'verified' },
      { user_id: u3._id, location: 'Trans-Amadi Slaughter',
        road_name: 'Trans-Amadi Road', severity: 'Low',
        description: 'Light pooling at market entrance, still passable.',
        latitude: 4.8050, longitude: 7.0600, status: 'verified' },
      { user_id: u4._id, location: 'Diobu Mile 3',
        road_name: 'Ikwerre Road', severity: 'High',
        description: 'Water level rising fast, road closed near Mile 3 market.',
        latitude: 4.8100, longitude: 7.0100, status: 'verified' },
      { user_id: u5._id, location: 'Woji Timber Market',
        road_name: 'Woji Road', severity: 'Medium',
        description: 'Floodwater draining slowly, avoid heavy vehicles.',
        latitude: 4.8300, longitude: 7.0700, status: 'pending' },
      { user_id: u1._id, location: 'Borokiri Sandfill',
        road_name: 'Olu-Obasanjo Road', severity: 'High',
        description: 'Deep flooding at Sandfill junction — cars cannot pass.',
        latitude: 4.7800, longitude: 7.0450, status: 'pending' },
      { user_id: u2._id, location: 'Choba Bridge Approach',
        road_name: 'Choba Road', severity: 'Low',
        description: 'Minor puddle on shoulder, no obstruction.',
        latitude: 4.8900, longitude: 6.9000, status: 'rejected',
        rejection_reason: 'Photo unclear; area dry on admin inspection.' },
      { user_id: u3._id, location: 'East-West Road Rumuokoro',
        road_name: 'East-West Road', severity: 'Medium',
        description: 'Standing water across both lanes, use caution.',
        latitude: 4.8000, longitude: 7.0300, status: 'pending' }
    ];
    await FloodReport.insertMany(reportsData);
    console.log(`Seeded ${reportsData.length} flood reports.`);

    // ---------- rainfall (one per monitored location) ----------
    const rainfallData = MONITORED.map((loc, i) => {
      // Deterministic but varied values: 8 → 60 mm across locations
      const amount = Number((8 + i * 7 + ((i * 3) % 5)).toFixed(1));
      return {
        location: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        rainfall_amount: amount,
        source: 'manual'
      };
    });
    await RainfallData.insertMany(rainfallData);
    console.log(`Seeded ${rainfallData.length} rainfall records.`);

    // ---------- predictions (2: one Moderate, one High) ----------
    const predictionsData = [
      {
        location: 'Port Harcourt (City Centre)',
        latitude: 4.8156, longitude: 7.0498,
        risk_level: 'High', rainfall_value: 58.4, confidence: 82
      },
      {
        location: 'Rumuokwuta',
        latitude: 4.8250, longitude: 7.0250,
        risk_level: 'Moderate', rainfall_value: 34.7, confidence: 68
      }
    ];
    await FloodPrediction.insertMany(predictionsData);
    console.log(`Seeded ${predictionsData.length} flood predictions.`);

    // ---------- system logs (demo activity) ----------
    const logsData = [
      { user_id: admin._id, action: 'System seeded with demo data', ip_address: '127.0.0.1' },
      { user_id: u1._id,    action: 'User registered', ip_address: '127.0.0.1' },
      { user_id: u1._id,    action: 'User logged in',  ip_address: '127.0.0.1' },
      { user_id: u1._id,    action: `Submitted flood report for Aba Road, Port Harcourt`, ip_address: '127.0.0.1' },
      { user_id: admin._id, action: 'Admin verified flood report (Aba Road, Port Harcourt)', ip_address: '127.0.0.1' },
      { user_id: u2._id,    action: 'User logged in',  ip_address: '127.0.0.1' },
      { user_id: admin._id, action: 'Ran flood prediction (8/8 succeeded, 0 failed)', ip_address: '127.0.0.1' }
    ];
    await SystemLog.insertMany(logsData);
    console.log(`Seeded ${logsData.length} system logs.`);

    console.log('\n✅ Seed completed successfully.\n');
    console.log('Login credentials:');
    console.log('  Admin   →  admin@flood.local  /  Admin123!');
    console.log('  User 1  →  chidi@example.com  /  User123!');
    console.log('  User 2  →  amaka@example.com  /  User123!');
    console.log('  User 3  →  tunde@example.com  /  User123!');
    console.log('  User 4  →  ngozi@example.com  /  User123!');
    console.log('  User 5  →  emeka@example.com  /  User123!  (inactive)\n');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seed();