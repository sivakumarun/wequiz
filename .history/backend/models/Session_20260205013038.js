const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  activeQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null },
  isActive: { type: Boolean, default: false },
  startTime: { type: Date },
  currentQuestionStartTime: { type: Date }
});

module.exports = mongoose.model('Session', SessionSchema);