const mongoose = require('mongoose');

require('dotenv').config();

async function dropOldDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect with admin credentials to drop database
    const adminConnection = await mongoose.connect(
      process.env.MONGODB_URI.replace('/quizamit?', '/admin?') || 'mongodb://localhost:27017/admin',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    
    const admin = adminConnection.connection.getClient().db('admin');
    
    // Drop the old quizamit database
    console.log('Dropping old quizamit database...');
    await adminConnection.connection.db('quizamit').dropDatabase();
    console.log('✅ Old quizamit database deleted successfully!');
    console.log('✅ Now using trainerpoll database exclusively');
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error dropping database:', error.message);
    console.log('\nAlternative: Manually delete quizamit database in MongoDB Compass');
    console.log('1. Right-click on "quizamit" database');
    console.log('2. Select "Drop Database"');
    console.log('3. Confirm deletion');
    
    mongoose.connection.close();
    process.exit(1);
  }
}

dropOldDatabase();