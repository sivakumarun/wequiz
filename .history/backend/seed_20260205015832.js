const mongoose = require('mongoose');
const ReportingManager = require('./models/ReportingManager');

require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trainerpoll', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const managers = [
  'Benhur F',
  'Harish K S',
  'Pradeep R',
  'Amit CH',
  'Kavitha D',
  'Daniel'
];

async function seedData() {
  try {
    await ReportingManager.deleteMany({});
    await ReportingManager.insertMany(managers.map(name => ({ name })));
    console.log('Sample data created successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding data:', error);
    mongoose.connection.close();
  }
}

seedData();