const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  activeQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null },
  currentQuestionStartTime: { type: Date, default: null },
  clearAllTriggered: { type: Boolean, default: false }, // Flag to signal users to logout
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', SessionSchema);