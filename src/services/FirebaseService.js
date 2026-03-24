const DATABASE_URL = 'https://huntersgate-19e0d-default-rtdb.firebaseio.com';

/**
 * Service to handle Firebase Realtime Database using REST API.
 * This avoids the need for a full config (API Key, etc.) if the DB is public.
 */
export const FirebaseService = {
    /**
     * Sync user profile and stats to Firebase.
     * @param {string} uid Unique User ID
     * @param {object} data Profile and stats data
     */
    async syncUserData(uid, data) {
        if (!uid) return;
        try {
            const url = `${DATABASE_URL}/users/${uid}.json`;
            const response = await fetch(url, {
                method: 'PUT',
                body: JSON.stringify({
                    ...data,
                    lastSync: new Date().toISOString()
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                console.warn('Firebase sync failed:', response.statusText);
            }
        } catch (error) {
            console.error('Error syncing with Firebase:', error);
        }
    },

    /**
     * Fetch all users for the leaderboard.
     * @returns {Promise<Array>} Sorted list of users
     */
    async fetchLeaderboard() {
        try {
            const url = `${DATABASE_URL}/users.json`;
            const response = await fetch(url);
            if (!response.ok) return [];
            
            const data = await response.json();
            if (!data) return [];

            // Convert object map to array and sort by XP/Level
            return Object.entries(data)
                .map(([id, user]) => ({
                    id,
                    ...user
                }))
                .filter(u => u.name && (u.totalXP !== undefined || u.level !== undefined))
                .sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0));
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            return [];
        }
    }
};
