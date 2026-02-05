require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trainerpoll', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Import Models
const User = require('./models/User');
const Question = require('./models/Question');
const Session = require('./models/Session');
const Response = require('./models/Response');
const ReportingManager = require('./models/ReportingManager');

// Middleware for admin authentication
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin Login Route
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ admin: true }, process.env.JWT_SECRET);
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// User Login Route
app.post('/api/user/login', async (req, res) => {
  try {
    const { employeeId, name, reportingManager } = req.body;
    let user = await User.findOne({ employeeId });
    if (!user) {
      user = await User.create({ employeeId, name, reportingManager });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reporting Managers Route
app.get('/api/reporting-managers', async (req, res) => {
  try {
    console.log('Fetching reporting managers...');
    const managers = await ReportingManager.find();
    console.log('Found managers:', managers);
    res.json(managers);
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Questions Routes (Admin only)
app.post('/api/questions', authenticateAdmin, async (req, res) => {
  try {
    const question = await Question.create(req.body);
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Session Routes
app.get('/api/session', async (req, res) => {
  try {
    let session = await Session.findOne({}).populate('activeQuestionId');
    if (!session) {
      session = await Session.create({});
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/session/start-question', authenticateAdmin, async (req, res) => {
  try {
    const { questionId } = req.body;
    await Session.updateOne({}, { activeQuestionId: questionId, currentQuestionStartTime: new Date() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/session/end-question', authenticateAdmin, async (req, res) => {
  try {
    await Session.updateOne({}, { activeQuestionId: null });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Response Routes
app.post('/api/responses', async (req, res) => {
  try {
    const response = await Response.create(req.body);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/responses/:questionId', async (req, res) => {
  try {
    const responses = await Response.find({ questionId: req.params.questionId }).populate('userId');
    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leaderboard Route
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await User.find().sort({ points: -1 });
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});