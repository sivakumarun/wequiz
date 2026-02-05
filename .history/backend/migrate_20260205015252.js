const mongoose = require('mongoose');

require('dotenv').config();

// Models
const User = require('./models/User');
const Question = require('./models/Question');
const Session = require('./models/Session');
const Response = require('./models/Response');
const ReportingManager = require('./models/ReportingManager');

async function migrateDatabase() {
  try {
    console.log('Starting database migration from quizamit to trainerpoll...');
    
    // Connect to trainerpoll database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trainerpoll', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to trainerpoll database');
    
    // Check if data already exists
    const userCount = await User.countDocuments();
    const questionCount = await Question.countDocuments();
    
    if (userCount > 0 || questionCount > 0) {
      console.log('Data already exists in trainerpoll database');
      console.log(`Users: ${userCount}, Questions: ${questionCount}`);
    } else {
      console.log('Seeding initial data to trainerpoll...');
      
      // Create sample reporting managers
      const managers = [
        'Rajesh Kumar',
        'Priya Sharma',
        'Amit Patel',
        'Divya Singh',
        'Vikram Gupta',
        'Sneha Desai',
        'Arjun Nair',
        'Pooja Verma'
      ];
      
      await ReportingManager.deleteMany({});
      await ReportingManager.insertMany(managers.map(name => ({ name })));
      console.log('Sample reporting managers created');
      
      // Create initial session
      await Session.deleteMany({});
      await Session.create({});
      console.log('Initial session created');
    }
    
    console.log('Migration completed successfully!');
    console.log('You can now safely delete the old quizamit database from MongoDB Atlas');
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Migration error:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

migrateDatabase();