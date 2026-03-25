import AsyncStorage from '@react-native-async-storage/async-storage';
import { mergeAchievementState } from '../constants/achievements';
import { FirebaseService } from './FirebaseService';
import { NotificationService } from './NotificationService';
import { InventoryService } from './InventoryService';

const KEYS = {
    USER_PROFILE: 'userProfile',
    WORKOUTS: 'workouts',
    ACHIEVEMENTS: 'achievements',
    SETTINGS: 'settings',
    USER_ID: 'uniqueUserId',
    SESSIONS: 'sessions', // For historical session data
};

const DEFAULT_SETTINGS = {
    theme: 'dark',
};

export const INITIAL_PROFILE = {
    uid: null,
    name: 'Hunter',
    createdDate: null,
    totalXP: 0,
    level: 1,
    streak: 0,
    bestStreak: 0,
    lastWorkoutDate: null,
    bodyStats: {
        bodyWeight: '',
        chest: '',
        waist: '',
        arms: '',
        notes: '',
    },
    customExercises: [],
    inventory: [],
    equipped: {
        aura: null,
        border: null,
        title: null,
    },
    activeDungeon: null,
    dungeonStartedAt: null,
    activeSession: null, // { startTime, exercises: [{ name, sets: [] }] }
};

function freshProfile() {
    return {
        ...INITIAL_PROFILE,
        createdDate: new Date().toISOString(),
    };
}

function normalizeProfile(p) {
    if (!p) return freshProfile();
    return {
        ...INITIAL_PROFILE,
        ...p,
        createdDate: p.createdDate || new Date().toISOString(),
        bodyStats: { ...INITIAL_PROFILE.bodyStats, ...(p.bodyStats || {}) },
        customExercises: (p.customExercises || []).map(ex => typeof ex === 'string' ? ex : (ex.name || 'Custom Exercise')),
        inventory: p.inventory || [],
        equipped: { ...INITIAL_PROFILE.equipped, ...(p.equipped || {}) },
        activeDungeon: p.activeDungeon || null,
        dungeonStartedAt: p.dungeonStartedAt || null,
        activeSession: p.activeSession ? {
            ...p.activeSession,
            exercises: (p.activeSession.exercises || []).map(ex => ({
                ...ex,
                name: typeof ex.name === 'string' ? ex.name : (ex.name?.name || 'Unknown Exercise')
            }))
        } : null,
    };
}

export const StorageService = {
    async getOrCreateUID() {
        let uid = await AsyncStorage.getItem(KEYS.USER_ID);
        if (!uid) {
            uid = 'hunter-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
            await AsyncStorage.setItem(KEYS.USER_ID, uid);
        }
        return uid;
    },

    async loadAllData() {
        try {
            const [profileItem, workoutsItem, achievementsItem, settingsItem] = await Promise.all([
                AsyncStorage.getItem(KEYS.USER_PROFILE),
                AsyncStorage.getItem(KEYS.WORKOUTS),
                AsyncStorage.getItem(KEYS.ACHIEVEMENTS),
                AsyncStorage.getItem(KEYS.SETTINGS),
            ]);

            const rawAchievements = achievementsItem ? JSON.parse(achievementsItem) : [];
            const achievements = mergeAchievementState(rawAchievements);
            
            let profile = normalizeProfile(profileItem ? JSON.parse(profileItem) : null);
            if (!profile.uid) {
                profile.uid = await this.getOrCreateUID();
            }

            const workoutsRaw = workoutsItem ? JSON.parse(workoutsItem) : [];
            const workouts = workoutsRaw.map(w => ({
                ...w,
                exercise: typeof w.exercise === 'string' ? w.exercise : (w.exercise?.name || 'Unknown Exercise')
            }));

            const sessionsItem = await AsyncStorage.getItem(KEYS.SESSIONS);
            const sessions = sessionsItem ? JSON.parse(sessionsItem) : [];

            return {
                profile,
                workouts,
                sessions,
                achievements,
                settings: settingsItem ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsItem) } : { ...DEFAULT_SETTINGS },
            };
        } catch (error) {
            console.error('Error loading data:', error);
            const uid = await this.getOrCreateUID();
            return {
                profile: { ...INITIAL_PROFILE, uid },
                workouts: [],
                achievements: mergeAchievementState([]),
                settings: { ...DEFAULT_SETTINGS },
            };
        }
    },

    async saveSettings(settings) {
        await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    },

    async saveUserProfile(profile) {
        await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
        if (profile.uid) {
            const workoutsStr = await AsyncStorage.getItem(KEYS.WORKOUTS);
            const achievementsStr = await AsyncStorage.getItem(KEYS.ACHIEVEMENTS);
            
            try {
                await FirebaseService.syncUserData(profile.uid, {
                    ...profile,
                    workouts: workoutsStr ? JSON.parse(workoutsStr) : [],
                    achievements: achievementsStr ? JSON.parse(achievementsStr) : [],
                    lastSync: new Date().toISOString()
                });
            } catch (e) {
                console.error('Failed to sync profile change:', e);
            }
        }
    },

    async saveBodyStats(stats) {
        const item = await AsyncStorage.getItem(KEYS.USER_PROFILE);
        let profile = normalizeProfile(item ? JSON.parse(item) : null);
        
        profile.bodyStats = {
            ...profile.bodyStats,
            ...stats
        };

        await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
        
        if (profile.uid) {
            const workoutsStr = await AsyncStorage.getItem(KEYS.WORKOUTS);
            const achievementsStr = await AsyncStorage.getItem(KEYS.ACHIEVEMENTS);
            
            await FirebaseService.syncUserData(profile.uid, {
                ...profile,
                workouts: workoutsStr ? JSON.parse(workoutsStr) : [],
                achievements: achievementsStr ? JSON.parse(achievementsStr) : [],
                lastSync: new Date().toISOString()
            });
        }
        return profile;
    },

    async saveSession(session) {
        const currentSessionsStr = await AsyncStorage.getItem(KEYS.SESSIONS);
        const currentSessions = currentSessionsStr ? JSON.parse(currentSessionsStr) : [];
        const newSessions = [session, ...currentSessions];
        await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(newSessions));
        
        // Also trigger sync if profile exists
        const profileStr = await AsyncStorage.getItem(KEYS.USER_PROFILE);
        if (profileStr) {
            const profile = JSON.parse(profileStr);
            if (profile.uid) {
                const workoutsStr = await AsyncStorage.getItem(KEYS.WORKOUTS);
                const achievementsStr = await AsyncStorage.getItem(KEYS.ACHIEVEMENTS);
                await FirebaseService.syncUserData(profile.uid, {
                    ...profile,
                    workouts: workoutsStr ? JSON.parse(workoutsStr) : [],
                    sessions: newSessions,
                    achievements: achievementsStr ? JSON.parse(achievementsStr) : [],
                    lastSync: new Date().toISOString()
                });
            }
        }
        return newSessions;
    },

    async saveWorkoutsList(workouts) {
        await AsyncStorage.setItem(KEYS.WORKOUTS, JSON.stringify(workouts));
    },

    async saveAchievements(achievements) {
        await AsyncStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
    },

    async saveWorkoutsBulk(newWorkoutsArray, updatedProfile, achievementIdsToUnlock = []) {
        const currentWorkoutsStr = await AsyncStorage.getItem(KEYS.WORKOUTS);
        const currentWorkouts = currentWorkoutsStr ? JSON.parse(currentWorkoutsStr) : [];
        const mergedWorkouts = [...newWorkoutsArray, ...currentWorkouts];

        const achStr = await AsyncStorage.getItem(KEYS.ACHIEVEMENTS);
        let achievements = mergeAchievementState(achStr ? JSON.parse(achStr) : []);
        const unlockSet = new Set(achievementIdsToUnlock);
        const now = new Date().toISOString();
        achievements = achievements.map((a) =>
            unlockSet.has(a.id) ? { ...a, unlocked: true, date: a.date || now } : a
        );

        await Promise.all([
            AsyncStorage.setItem(KEYS.WORKOUTS, JSON.stringify(mergedWorkouts)),
            AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(updatedProfile)),
            AsyncStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(achievements)),
        ]);

        const newLoot = InventoryService.checkUnlocks(updatedProfile, mergedWorkouts);
        if (newLoot.length > 0) {
            updatedProfile.inventory = [...(updatedProfile.inventory || []), ...newLoot];
            await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(updatedProfile));
        }

        if (updatedProfile.uid) {
            const sessionsStr = await AsyncStorage.getItem(KEYS.SESSIONS);
            const sessions = sessionsStr ? JSON.parse(sessionsStr) : [];
            
            FirebaseService.syncUserData(updatedProfile.uid, {
                ...updatedProfile,
                workouts: mergedWorkouts,
                sessions: sessions,
                achievements: achievements,
                lastSync: new Date().toISOString()
            });
        }

        NotificationService.resetPenaltyQuestTimer();
        return { workouts: mergedWorkouts, achievements };
    },

    async saveWorkout(workout, updatedProfile, achievementIdsToUnlock = []) {
        const currentWorkoutsStr = await AsyncStorage.getItem(KEYS.WORKOUTS);
        const currentWorkouts = currentWorkoutsStr ? JSON.parse(currentWorkoutsStr) : [];
        const newWorkouts = [workout, ...currentWorkouts];

        const achStr = await AsyncStorage.getItem(KEYS.ACHIEVEMENTS);
        let achievements = mergeAchievementState(achStr ? JSON.parse(achStr) : []);
        const unlockSet = new Set(achievementIdsToUnlock);
        const now = new Date().toISOString();
        achievements = achievements.map((a) =>
            unlockSet.has(a.id) ? { ...a, unlocked: true, date: a.date || now } : a
        );

        await Promise.all([
            AsyncStorage.setItem(KEYS.WORKOUTS, JSON.stringify(newWorkouts)),
            AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(updatedProfile)),
            AsyncStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(achievements)),
        ]);

        const newLoot = InventoryService.checkUnlocks(updatedProfile, newWorkouts);
        if (newLoot.length > 0) {
            updatedProfile.inventory = [...(updatedProfile.inventory || []), ...newLoot];
            await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(updatedProfile));
        }

        if (updatedProfile.activeDungeon) {
            const dungeons = [
                { id: 'dungeon_beginner', target: 5, reward: 500 },
                { id: 'dungeon_intermediate', target: 12, reward: 2500 },
                { id: 'dungeon_advanced', target: 20, reward: 10000 }
            ];
            const active = dungeons.find(d => d.id === updatedProfile.activeDungeon);
            if (active) {
                const startT = new Date(updatedProfile.dungeonStartedAt || 0).getTime();
                const count = newWorkouts.filter(w => new Date(w.date).getTime() >= startT).length;
                if (count >= active.target) {
                    updatedProfile.totalXP += active.reward;
                    updatedProfile.activeDungeon = null;
                    updatedProfile.dungeonStartedAt = null;
                    if (!updatedProfile.inventory.includes('title_slayer')) {
                        updatedProfile.inventory.push('title_slayer');
                    }
                    await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(updatedProfile));
                }
            }
        }

        if (updatedProfile.uid) {
            FirebaseService.syncUserData(updatedProfile.uid, {
                ...updatedProfile,
                workouts: newWorkouts,
                achievements: achievements,
                inventory: updatedProfile.inventory,
                equipped: updatedProfile.equipped,
                activeDungeon: updatedProfile.activeDungeon
            });
        }

        NotificationService.resetPenaltyQuestTimer();
        return { workouts: newWorkouts, achievements };
    },

    async importCloudData(uid) {
        if (!uid) return null;
        const cloudData = await FirebaseService.fetchUserData(uid);
        if (cloudData) {
            const { workouts, achievements, ...profile } = cloudData;
            const finalProfile = { ...profile, uid: uid };

            await Promise.all([
                AsyncStorage.setItem(KEYS.USER_ID, uid),
                AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(finalProfile)),
                AsyncStorage.setItem(KEYS.WORKOUTS, JSON.stringify(workouts || [])),
                AsyncStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(achievements || []))
            ]);
            return { profile: finalProfile, workouts: workouts || [], achievements: achievements || [] };
        }
        return null;
    },

    async exportData() {
        const data = await this.loadAllData();
        return JSON.stringify(
            {
                exportedAt: new Date().toISOString(),
                app: 'Solo Leveling Gym Tracker',
                userProfile: data.profile,
                workouts: data.workouts,
                achievements: data.achievements,
                settings: data.settings,
            },
            null,
            2
        );
    },

    async clearAllData() {
        try {
            const uid = await AsyncStorage.getItem(KEYS.USER_ID);
            if (uid) {
                await FirebaseService.deleteUserData(uid);
            }
        } catch (e) {
            console.warn('Failed to delete cloud data during reset:', e);
        }
        await AsyncStorage.clear();
    },
};
