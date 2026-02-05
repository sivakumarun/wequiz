const mongoose = require('mongoose');

const QuizSessionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    startTime: { type: Date },
    endTime: { type: Date },
    isActive: { type: Boolean, default: false },
    createdBy: { type: String }, // Admin who created it
    totalParticipants: { type: Number, default: 0 },
    avgAccuracy: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuizSession', QuizSessionSchema);
