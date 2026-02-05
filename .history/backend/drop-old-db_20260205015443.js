const { MongoClient } = require('mongodb');

require('dotenv').config();

async function dropOldDatabase() {
  const client = new MongoClient(
    process.env.MONGODB_URI.replace('/trainerpoll?', '/?') || 'mongodb://localhost:27017'
  );
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    
    console.log('Dropping old quizamit database...');
    await client.db('quizamit').dropDatabase();
    
    console.log('✅ Old quizamit database deleted successfully!');
    console.log('✅ Now using trainerpoll database exclusively');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nManual deletion:');
    console.log('1. Open MongoDB Compass');
    console.log('2. Right-click on "quizamit" database');
    console.log('3. Click "Drop Database"');
    console.log('4. Confirm deletion');
  } finally {
    await client.close();
  }
}

dropOldDatabase();