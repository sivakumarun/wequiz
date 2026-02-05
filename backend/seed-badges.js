// Seed predefined badges into database
const mongoose = require('mongoose');
require('dotenv').config();

const Badge = require('./models/Badge');

const predefinedBadges = [
    {
        name: 'Rising Star',
        description: 'Answered your first question',
        icon: '⭐',
        criteria: { type: 'participation', threshold: 1 }
    },
    {
        name: 'Speed Demon',
        description: 'Answer correctly in under 5 seconds',
        icon: '⚡',
        criteria: { type: 'speed', threshold: 5000 }
    },
    {
        name: 'Perfect Score',
        description: 'Achieve 100% accuracy on 10+ questions',
        icon: '💯',
        criteria: { type: 'accuracy', threshold: 100 }
    },
    {
        name: 'Accuracy Expert',
        description: 'Maintain 90%+ accuracy with 20+ questions answered',
        icon: '🎯',
        criteria: { type: 'accuracy', threshold: 90 }
    },
    {
        name: 'Consistent Performer',
        description: 'Participate in 5 quiz sessions',
        icon: '🔥',
        criteria: { type: 'participation', threshold: 5 }
    },
    {
        name: 'Quiz Master',
        description: 'Reach top 3 in the leaderboard',
        icon: '👑',
        criteria: { type: 'rank', threshold: 3 }
    },
    {
        name: 'Dedicated Learner',
        description: 'Answer 50+ questions',
        icon: '📚',
        criteria: { type: 'participation', threshold: 50 }
    },
    {
        name: 'Champion',
        description: 'Answer 100+ questions',
        icon: '🏆',
        criteria: { type: 'participation', threshold: 100 }
    }
];

async function seedBadges() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trainerpoll');
        console.log('Connected to MongoDB');

        // Clear existing badges
        await Badge.deleteMany({});
        console.log('Cleared existing badges');

        // Insert predefined badges
        const badges = await Badge.insertMany(predefinedBadges);
        console.log(`Seeded ${badges.length} badges`);

        badges.forEach(badge => {
            console.log(`  - ${badge.icon} ${badge.name}: ${badge.description}`);
        });

        await mongoose.connection.close();
        console.log('Done!');
    } catch (error) {
        console.error('Error seeding badges:', error);
        process.exit(1);
    }
}

seedBadges();
