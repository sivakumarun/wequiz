const mongoose = require('mongoose');

const BadgeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    icon: { type: String, default: '🏆' }, // Emoji or icon identifier
    criteria: {
        type: { type: String, enum: ['speed', 'accuracy', 'streak', 'participation', 'rank'], required: true },
        threshold: { type: Number, required: true }
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Badge', BadgeSchema);
