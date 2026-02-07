const mongoose = require('mongoose');

const ResponseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizSession' },
  answer: { type: String, required: true },
  responseTime: { type: Number }, // In milliseconds
  isCorrect: { type: Boolean },
  pointsEarned: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Middleware to auto-calculate correctness and update user stats
ResponseSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      // Get the question to check correct answer
      const Question = mongoose.model('Question');
      const question = await Question.findById(this.questionId);

      if (question && question.correctAnswer) {
        // Check if answer is correct
        this.isCorrect = this.answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();

        // Calculate points earned
        if (this.isCorrect) {
          let points = question.points || 1;

          // Bonus points for speed (if answered in under 5 seconds)
          if (this.responseTime && this.responseTime < 5000) {
            points += 5;
          }

          this.pointsEarned = points;
        } else {
          this.pointsEarned = 0;
        }

        // Update user statistics
        const User = mongoose.model('User');
        const updateData = {
          $inc: {
            totalQuestions: 1,
            points: this.pointsEarned
          },
          lastActive: new Date()
        };

        if (this.isCorrect) {
          updateData.$inc.correctAnswers = 1;
        }

        await User.findByIdAndUpdate(this.userId, updateData);

        // Recalculate user accuracy
        const user = await User.findById(this.userId);
        if (user && user.totalQuestions > 0) {
          user.accuracy = Math.round((user.correctAnswers / user.totalQuestions) * 100);
          await user.save();
        }
      }
    } catch (error) {
      console.error('Error in Response pre-save middleware:', error);
    }
  }
  next();
});

module.exports = mongoose.model('Response', ResponseSchema);