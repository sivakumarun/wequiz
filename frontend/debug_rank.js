// DEBUGGING VERSION - Get user's current rank from leaderboard
async function getUserRank() {
    try {
        console.log('=== getUserRank DEBUG START ===');
        console.log('Current user:', currentUser);

        const response = await fetch(`${API_BASE_URL}/leaderboard`);
        const leaderboard = await response.json();

        console.log('Leaderboard data:', leaderboard);
        console.log('Leaderboard length:', leaderboard.length);

        // Find user's position in the sorted leaderboard
        const userIndex = leaderboard.findIndex(u => u._id === currentUser._id);
        console.log('User index:', userIndex);
        console.log('User _id:', currentUser._id);

        if (userIndex === -1) {
            console.log('User not found in leaderboard, returning -');
            return '-';
        }

        // The rank is simply the position + 1, BUT we need to handle ties
        let rank = userIndex + 1;
        console.log('Initial rank (position + 1):', rank);

        // Check if there are users ahead with the SAME score and time (tied)
        const currentUserData = leaderboard[userIndex];
        console.log('Current user data from leaderboard:', currentUserData);

        for (let i = 0; i < userIndex; i++) {
            if (leaderboard[i].points === currentUserData.points &&
                leaderboard[i].avgResponseTime === currentUserData.avgResponseTime) {
                console.log('Found tied user at index', i);
                rank = i + 1;
                break;
            }
        }

        console.log('Final rank:', rank);
        console.log('=== getUserRank DEBUG END ===');
        return `#${rank}`;
    } catch (error) {
        console.error('Error fetching rank:', error);
        return '-';
    }
}
