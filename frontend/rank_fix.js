// Get user's current rank from leaderboard
async function getUserRank() {
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard`);
        const leaderboard = await response.json();

        // Find user in leaderboard
        const userIndex = leaderboard.findIndex(u => u._id === currentUser._id);
        if (userIndex === -1) return '-';

        // Simply count how many users are ahead with better scores
        // The leaderboard is already sorted by backend with tie-breaker logic
        let rank = 1;
        const currentUserData = leaderboard[userIndex];

        // Count unique ranks ahead of current user
        for (let i = 0; i < userIndex; i++) {
            // If this user has different points or time than current user, they have a better rank
            if (leaderboard[i].points !== currentUserData.points ||
                leaderboard[i].avgResponseTime !== currentUserData.avgResponseTime) {
                rank++;
            }
        }

        return `#${rank}`;
    } catch (error) {
        console.error('Error fetching rank:', error);
        return '-';
    }
}
