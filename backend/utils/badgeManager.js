// Badge award manager - checks and awards badges to users
const Badge = require('../models/Badge');
const User = require('../models/User');

class BadgeManager {
    // Check and award badges after a user action
    static async checkAndAwardBadges(userId) {
        try {
            const user = await User.findById(userId).populate('badges.badgeId');
            if (!user) return;

            const allBadges = await Badge.find();
            const earnedBadgeIds = new Set(user.badges.map(b => b.badgeId?._id?.toString()));

            for (const badge of allBadges) {
                // Skip if already earned
                if (earnedBadgeIds.has(badge._id.toString())) continue;

                let shouldAward = false;

                // Check criteria
                switch (badge.criteria.type) {
                    case 'participation':
                        shouldAward = user.totalQuestions >= badge.criteria.threshold;
                        break;

                    case 'accuracy':
                        if (badge.name === 'Perfect Score') {
                            shouldAward = user.accuracy === 100 && user.totalQuestions >= 10;
                        } else if (badge.name === 'Accuracy Expert') {
                            shouldAward = user.accuracy >= 90 && user.totalQuestions >= 20;
                        } else {
                            shouldAward = user.accuracy >= badge.criteria.threshold;
                        }
                        break;

                    case 'rank':
                        // This will be checked separately when leaderboard is calculated
                        // For now, skip
                        break;
                }

                if (shouldAward) {
                    // Award badge
                    user.badges.push({
                        badgeId: badge._id,
                        earnedAt: new Date()
                    });
                    console.log(`🏆 Badge "${badge.name}" awarded to user ${user.employeeId}`);
                }
            }

            await user.save();
        } catch (error) {
            console.error('Error in BadgeManager.checkAndAwardBadges:', error);
        }
    }

    // Award rank-based badges
    static async awardRankBadges(leaderboard) {
        try {
            const topUsers = leaderboard.slice(0, 3);
            const quizMasterBadge = await Badge.findOne({ name: 'Quiz Master' });

            if (!quizMasterBadge) return;

            for (const userEntry of topUsers) {
                const user = await User.findById(userEntry._id);
                if (!user) continue;

                const hasQuizMaster = user.badges.some(
                    b => b.badgeId?.toString() === quizMasterBadge._id.toString()
                );

                if (!hasQuizMaster) {
                    user.badges.push({
                        badgeId: quizMasterBadge._id,
                        earnedAt: new Date()
                    });
                    await user.save();
                    console.log(`👑 Quiz Master badge awarded to ${user.employeeId}`);
                }
            }
        } catch (error) {
            console.error('Error in BadgeManager.awardRankBadges:', error);
        }
    }
}

module.exports = BadgeManager;
