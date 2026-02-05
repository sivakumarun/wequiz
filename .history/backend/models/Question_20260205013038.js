const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['MCQ', 'True/False', 'Poll', 'WordCloud'], required: true },
  options: [{ type: String }], // For MCQ and Poll
  correctAnswer: { type: String }, // For MCQ and True/False
  points: { type: Number, default: 10 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Question', QuestionSchema);