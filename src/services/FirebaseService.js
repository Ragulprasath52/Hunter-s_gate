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
                const errText = await response.text();
                console.warn('Firebase sync failed:', response.status, errText);
            }
        } catch (error) {
            console.error('Error syncing with Firebase:', error);
        }
    },

    /**
     * Fetch all data for a specific user.
     * @param {string} uid Unique User ID
     * @returns {Promise<object|null>} User data or null
     */
    async fetchUserData(uid) {
        if (!uid) return null;
        try {
            const url = `${DATABASE_URL}/users/${uid}.json`;
            const response = await fetch(url);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('Error fetching user from Firebase:', error);
            return null;
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
    },

    /**
     * Permanent user data incineration.
     * @param {string} uid Unique User ID
     */
    async deleteUserData(uid) {
        if (!uid) return;
        try {
            const url = `${DATABASE_URL}/users/${uid}.json`;
            const response = await fetch(url, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const errText = await response.text();
                console.warn('Firebase deletion failed:', response.status, errText);
            }
        } catch (error) {
            console.error('Error deleting user from Firebase:', error);
        }
    }
};
