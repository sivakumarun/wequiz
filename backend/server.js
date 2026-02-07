require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const multer = require('multer');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
  origin: ['https://wequiz-one.vercel.app', 'http://localhost:3000', 'http://localhost:5001'],
  credentials: true
}));
app.use(express.json());

// Setup multer for file uploads
const upload = multer({ dest: 'uploads/' });

// MongoDB connection
// MongoDB connection
const dbUri = process.env.MONGODB_URI || 'mongodb+srv://sivakumarun_db_admin:9QNF61j73JfLzkgN@quiz.vmghgku.mongodb.net/trainerpoll?retryWrites=true&w=majority&appName=quiz';

// Configuration with Fallbacks
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

console.log('Attempting to connect to DB at:', dbUri.startsWith('mongodb+srv') ? 'Remote MongoDB Cluster (Correct)' : 'Localhost (Wrong - Env Var Not Set)');
mongoose.connect(dbUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  tls: true,
  tlsAllowInvalidCertificates: true, // Temporary fix for Node.js v24 SSL compatibility
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
  initializeDefaultCategories();
});

// Import Models
const User = require('./models/User');
const Question = require('./models/Question');
const Session = require('./models/Session');
const Response = require('./models/Response');
const ReportingManager = require('./models/ReportingManager');
const Category = require('./models/Category');
const Badge = require('./models/Badge');
const QuizSession = require('./models/QuizSession');

// Import Utilities
const BadgeManager = require('./utils/badgeManager');

// Middleware for admin authentication
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin Login Route
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ admin: true }, JWT_SECRET);
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
      user = await User.create({
        employeeId,
        name,
        reportingManager,
        lastActive: new Date(),
        isActive: true,
        sessionStarted: new Date()
      });
    } else {
      // Update session tracking for existing user
      user.lastActive = new Date();
      user.isActive = true;
      user.sessionStarted = new Date();
      await user.save();
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Logout Route
app.post('/api/user/logout', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (user) {
      user.isActive = false;
      await user.save();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get User by ID (for session validation)
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
    // Set default points to 1 if not provided
    const questionData = {
      ...req.body,
      points: req.body.points || 1
    };
    const question = await Question.create(questionData);
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

app.get('/api/questions/:id', async (req, res) => {
  try {
    console.log('Fetching question by ID:', req.params.id);
    const question = await Question.findById(req.params.id);
    console.log('Question found:', question);
    if (!question) {
      console.warn('Question not found for ID:', req.params.id);
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Question (Admin only)
app.delete('/api/questions/:id', authenticateAdmin, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if question is currently active
    const session = await Session.findOne({});
    if (session && session.activeQuestionId && session.activeQuestionId.toString() === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete active question. Please end the question first.' });
    }

    await Question.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit Question (Admin only)
app.put('/api/questions/:id', authenticateAdmin, async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json(question);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CSV Bulk Upload (Admin only)
app.post('/api/questions/bulk-upload', authenticateAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const questions = [];
    const errors = [];
    let lineNumber = 1;

    // Track new categories to ensure they exist
    const categoriesSet = new Set();
    // Cache existing categories to minimize DB lookups
    const existingCategoryDocs = await Category.find();
    const existingCategories = new Set(existingCategoryDocs.map(c => c.name));

    // Read and parse CSV
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => {
        lineNumber++;
        try {
          // Normalizing keys to handle potential BOM or whitespace issues in CSV headers
          const cleanRow = {};
          Object.keys(row).forEach(key => {
            cleanRow[key.trim()] = row[key];
          });

          // Map fields from new CSV format:
          // Category, Question Type, Question Text, Option 1, Option 2, Option 3, Option 4, Correct Answer Option

          const category = cleanRow['Category'] ? cleanRow['Category'].trim() : 'General';
          const type = cleanRow['Question Type'] ? cleanRow['Question Type'].trim() : '';
          const text = cleanRow['Question Text'] ? cleanRow['Question Text'].trim() : '';
          const correctAnswer = cleanRow['Correct Answer Option'] ? cleanRow['Correct Answer Option'].trim() : '';

          // Validate required fields
          if (!text || !type) {
            errors.push(`Line ${lineNumber}: Missing required fields (Question Text, Question Type)`);
            return;
          }

          // options
          const options = [];
          if (cleanRow['Option 1']) options.push(cleanRow['Option 1'].trim());
          if (cleanRow['Option 2']) options.push(cleanRow['Option 2'].trim());
          if (cleanRow['Option 3']) options.push(cleanRow['Option 3'].trim());
          if (cleanRow['Option 4']) options.push(cleanRow['Option 4'].trim());

          const question = {
            text,
            type,
            category,
            options,
            correctAnswer,
            points: 1 // Default points to 1
          };

          // Validate type
          if (!['MCQ', 'True/False', 'Poll', 'WordCloud'].includes(question.type)) {
            errors.push(`Line ${lineNumber}: Invalid question type "${question.type}"`);
            return;
          }

          // Validate options for MCQ
          if (question.type === 'MCQ' && options.length < 2) {
            errors.push(`Line ${lineNumber}: MCQ requires at least 2 options`);
            return;
          }

          questions.push(question);
          categoriesSet.add(category);

        } catch (error) {
          errors.push(`Line ${lineNumber}: ${error.message}`);
        }
      })
      .on('end', async () => {
        try {
          // Delete uploaded file
          fs.unlinkSync(req.file.path);

          if (errors.length > 0) {
            return res.status(400).json({
              error: 'Validation errors found',
              errors,
              successCount: questions.length
            });
          }

          // Ensure all categories exist
          for (const catName of categoriesSet) {
            if (!existingCategories.has(catName)) {
              await Category.create({ name: catName });
              existingCategories.add(catName); // Add to local cache
              console.log(`Created new category from CSV: ${catName}`);
            }
          }

          // Insert valid questions
          const inserted = await Question.insertMany(questions);
          res.json({
            success: true,
            message: `Successfully uploaded ${inserted.length} questions`,
            count: inserted.length
          });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      })
      .on('error', (error) => {
        fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
      });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

// Download CSV Template
app.get('/api/questions/csv-template', (req, res) => {
  const template = [
    {
      'Category': 'Marketing',
      'Question Type': 'MCQ',
      'Question Text': 'When was SBI Cards launched?',
      'Option 1': 'October 1998',
      'Option 2': 'July 1955',
      'Option 3': 'January 1999',
      'Option 4': 'March 2001',
      'Correct Answer Option': 'October 1998'
    },
    {
      'Category': 'Sales',
      'Question Type': 'True/False',
      'Question Text': 'Is the sky blue?',
      'Option 1': 'True',
      'Option 2': 'False',
      'Option 3': '',
      'Option 4': '',
      'Correct Answer Option': 'True'
    }
  ];

  try {
    const fields = ['Category', 'Question Type', 'Question Text', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer Option'];
    const parser = new Parser({ fields });
    const csv = parser.parse(template);

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="question_template.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Session Routes
app.get('/api/session', async (req, res) => {
  try {
    let session = await Session.findOne({}).populate('activeQuestionId');
    if (!session) {
      console.log('No session found, creating new one');
      session = await Session.create({});
    }

    // Add Stats - Only count users currently logged in (isActive = true)
    const activeUserCount = await User.countDocuments({
      isActive: true
    });
    const responseCount = session.activeQuestionId
      ? await Response.countDocuments({ questionId: session.activeQuestionId })
      : 0;

    const sessionData = session.toObject();
    sessionData.activeUserCount = activeUserCount;
    sessionData.responseCount = responseCount;

    console.log('Session data:', sessionData);
    res.json(sessionData);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/session/start-question', authenticateAdmin, async (req, res) => {
  try {
    const { questionId } = req.body;
    console.log('Starting question with ID:', questionId);

    // Update session with active question
    const result = await Session.updateOne({}, { activeQuestionId: questionId, currentQuestionStartTime: new Date() });
    console.log('Update result:', result);

    // Increment timesLaunched and update lastLaunched for the question
    await Question.findByIdAndUpdate(questionId, {
      $inc: { timesLaunched: 1 },
      lastLaunched: new Date()
    });

    const updated = await Session.findOne({}).populate('activeQuestionId');
    console.log('Session after update:', updated);
    res.json({ success: true, session: updated });
  } catch (error) {
    console.error('Error starting question:', error);
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
    const { userId, questionId } = req.body;

    // Check if user has already answered this question
    const existingResponse = await Response.findOne({ userId, questionId });

    if (existingResponse) {
      return res.status(400).json({
        error: 'You have already answered this question',
        alreadyAnswered: true
      });
    }

    const response = await Response.create(req.body);

    // Check and award badges after response (done asynchronously)
    BadgeManager.checkAndAwardBadges(userId).catch(err =>
      console.error('Badge check error:', err)
    );

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if user has already answered a question
app.get('/api/responses/check/:questionId/:userId', async (req, res) => {
  try {
    const { questionId, userId } = req.params;
    const existingResponse = await Response.findOne({ userId, questionId });
    res.json({ hasAnswered: !!existingResponse });
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

// Enhanced Leaderboard Route
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { manager, sortBy = 'points', limit = 100 } = req.query;

    // Build query
    let query = {};
    if (manager && manager !== 'all') {
      query.reportingManager = manager;
    }

    // Build sort
    let sort = {};
    switch (sortBy) {
      case 'accuracy':
        sort = { accuracy: -1, points: -1 };
        break;
      case 'questions':
        sort = { totalQuestions: -1, points: -1 };
        break;
      default:
        sort = { points: -1, accuracy: -1 };
    }

    // Get leaderboard with badges populated
    const leaderboard = await User.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .populate('badges.badgeId')
      .select('employeeId name reportingManager points totalQuestions correctAnswers accuracy badges participatedSessions');

    // Add ranking
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      _id: user._id,  // CRITICAL: Include _id for rank matching
      rank: index + 1,
      employeeId: user.employeeId,
      name: user.name,
      reportingManager: user.reportingManager,
      points: user.points,
      totalQuestions: user.totalQuestions,
      correctAnswers: user.correctAnswers,
      accuracy: user.accuracy,
      badges: user.badges.map(b => ({
        name: b.badgeId?.name || 'Unknown',
        icon: b.badgeId?.icon || '🏆',
        earnedAt: b.earnedAt
      })),
      sessionsParticipated: user.participatedSessions?.length || 0
    }));

    // Award rank badges (asynchronously)
    BadgeManager.awardRankBadges(leaderboard).catch(err =>
      console.error('Rank badge error:', err)
    );

    res.json(rankedLeaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reporting Manager CRUD (Admin only)
app.post('/api/reporting-managers', authenticateAdmin, async (req, res) => {
  try {
    const manager = await ReportingManager.create(req.body);
    res.json(manager);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/reporting-managers/:id', authenticateAdmin, async (req, res) => {
  try {
    const manager = await ReportingManager.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }
    res.json(manager);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/reporting-managers/:id', authenticateAdmin, async (req, res) => {
  try {
    const manager = await ReportingManager.findByIdAndDelete(req.params.id);
    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }
    res.json({ success: true, message: 'Manager deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get trainers under a manager
app.get('/api/reporting-managers/:id/trainers', async (req, res) => {
  try {
    const manager = await ReportingManager.findById(req.params.id);
    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }
    const trainers = await User.find({ reportingManager: manager.name });
    res.json(trainers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Badges Routes
app.get('/api/badges', async (req, res) => {
  try {
    const badges = await Badge.find();
    res.json(badges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:id/badges', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('badges.badgeId');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.badges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics Routes
app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalQuestions = await Question.countDocuments();
    const totalResponses = await Response.countDocuments();
    const activeToday = await User.countDocuments({
      lastActive: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    const avgAccuracy = await User.aggregate([
      { $group: { _id: null, avgAccuracy: { $avg: '$accuracy' } } }
    ]);

    const avgResponseTime = await Response.aggregate([
      { $group: { _id: null, avgTime: { $avg: '$responseTime' } } }
    ]);

    res.json({
      totalUsers,
      totalQuestions,
      totalResponses,
      activeToday,
      avgAccuracy: avgAccuracy[0]?.avgAccuracy || 0,
      avgResponseTime: (avgResponseTime[0]?.avgTime || 0) / 1000 // Convert to seconds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics/question/:id', async (req, res) => {
  try {
    const responses = await Response.find({ questionId: req.params.id }).populate('userId');
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const totalResponses = responses.length;
    const correctResponses = responses.filter(r => r.isCorrect).length;
    const accuracy = totalResponses > 0 ? (correctResponses / totalResponses) * 100 : 0;

    // Answer distribution
    const distribution = {};
    responses.forEach(r => {
      distribution[r.answer] = (distribution[r.answer] || 0) + 1;
    });

    res.json({
      question,
      totalResponses,
      correctResponses,
      accuracy: Math.round(accuracy),
      distribution,
      responses: responses.map(r => ({
        user: r.userId?.name || 'Unknown',
        employeeId: r.userId?.employeeId || 'Unknown',
        answer: r.answer,
        isCorrect: r.isCorrect,
        responseTime: r.responseTime,
        pointsEarned: r.pointsEarned
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Detailed CSV Report
app.get('/api/reports/detailed', authenticateAdmin, async (req, res) => {
  try {
    const responses = await Response.find()
      .populate('userId')
      .populate('questionId')
      .sort({ createdAt: -1 });

    const reportData = responses.map(r => {
      const user = r.userId || {};
      const question = r.questionId || {};

      return {
        'Date': r.createdAt ? new Date(r.createdAt).toLocaleString() : '',
        'Reporting Manager': user.reportingManager || 'Unknown',
        'Employee ID': user.employeeId || 'Unknown',
        'Name': user.name || 'Unknown',
        'Question Category': question.category || '',
        'Question Type': question.type || '',
        'Question': question.text || 'Deleted Question',
        'User Answer': r.answer || '',
        'Correct Answer': question.correctAnswer || '',
        'Is Correct': r.isCorrect ? 'Yes' : 'No',
        'Score': r.pointsEarned || 0,
        'Response Time (ms)': r.responseTime || 0
      };
    });

    const fields = [
      'Date', 'Reporting Manager', 'Employee ID', 'Name',
      'Question Category', 'Question Type', 'Question',
      'User Answer', 'Correct Answer', 'Is Correct', 'Score', 'Response Time (ms)'
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(reportData);

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="quiz_report_${Date.now()}.csv"`);
    res.send(csv);

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// ==================== CATEGORY MANAGEMENT ====================

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

// Add new category
app.post('/api/categories', authenticateAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const category = new Category({ name });
    await category.save();
    res.json(category);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Category already exists' });
    } else {
      res.status(500).json({ error: 'Error creating category' });
    }
  }
});

// Update category
app.put('/api/categories/:id', authenticateAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Error updating category' });
  }
});

// Delete category
app.delete('/api/categories/:id', authenticateAdmin, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting category' });
  }
});

// Leaderboard endpoint with fastest finger tiebreaker
app.get('/api/leaderboard', async (req, res) => {
  try {
    const users = await User.find();

    // Calculate stats for each user
    const leaderboard = await Promise.all(users.map(async (user) => {
      const responses = await Response.find({ userId: user._id });

      // Calculate points
      const points = responses.reduce((sum, r) => sum + (r.points || 0), 0);

      // Calculate average response time
      const validResponses = responses.filter(r => r.responseTime && r.responseTime > 0);
      const avgResponseTime = validResponses.length > 0
        ? validResponses.reduce((sum, r) => sum + r.responseTime, 0) / validResponses.length
        : 999999; // High number for users with no response times

      // Calculate accuracy
      const correctAnswers = responses.filter(r => r.isCorrect).length;
      const accuracy = responses.length > 0 ? Math.round((correctAnswers / responses.length) * 100) : 0;

      return {
        _id: user._id,
        name: user.name,
        employeeId: user.employeeId,
        reportingManager: user.reportingManager,
        points,
        accuracy,
        avgResponseTime: Math.round(avgResponseTime),
        totalQuestions: responses.length
      };
    }));

    // Sort by points (descending), then by avgResponseTime (ascending - faster is better)
    leaderboard.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points; // Higher points first
      }
      return a.avgResponseTime - b.avgResponseTime; // Lower time first (faster)
    });

    res.json(leaderboard);
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Migrate all questions to 1 point (Admin only)
app.post('/api/questions/migrate-points', authenticateAdmin, async (req, res) => {
  try {
    const result = await Question.updateMany(
      {}, // Update all questions
      { $set: { points: 1 } }
    );

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} questions to 1 point`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error migrating question points:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear all responses and users (Fresh Start)
app.delete('/api/responses/clear-all', authenticateAdmin, async (req, res) => {
  try {
    // Step 1: Set the clearAllTriggered flag to signal all users to logout
    await Session.updateOne({}, { clearAllTriggered: true });

    // Step 2: Wait 3 seconds for users to receive the signal and logout
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Delete all responses and users
    const responseResult = await Response.deleteMany({});
    const userResult = await User.deleteMany({}); // Delete all users too

    // Step 4: Reset the clearAllTriggered flag
    await Session.updateOne({}, { clearAllTriggered: false });

    res.json({
      success: true,
      message: `Fresh Start: Cleared ${responseResult.deletedCount} responses and ${userResult.deletedCount} users.`,
      deletedCount: responseResult.deletedCount
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize default categories if none exist
async function initializeDefaultCategories() {
  try {
    const count = await Category.countDocuments();
    if (count === 0) {
      const defaultCategories = [
        'General',
        'Sales',
        'Marketing',
        'Leadership',
        'Technology',
        'Product Knowledge',
        'Customer Service',
        'HR & Compliance'
      ];

      await Category.insertMany(defaultCategories.map(name => ({ name })));
      console.log('Default categories initialized');
    }
  } catch (error) {
    console.error('Error initializing categories:', error);
  }
}

// Start server
const PORT = process.env.PORT || 5001;

// Only listen if running directly (not required as a module)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the app for Vercel
module.exports = app;