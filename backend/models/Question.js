const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, required: true, enum: ['MCQ', 'True/False', 'Poll', 'WordCloud'] },
  category: { type: String, default: 'General' }, // Category for filtering
  options: [String],
  correctAnswer: { type: String },
  points: { type: Number, default: 10 },
  timesLaunched: { type: Number, default: 0 }, // Track how many times released
  lastLaunched: { type: Date }, // When was it last launched
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Question', QuestionSchema);