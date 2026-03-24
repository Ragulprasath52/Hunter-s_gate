import AsyncStorage from '@react-native-async-storage/async-storage';
import { mergeAchievementState } from '../constants/achievements';
import { FirebaseService } from './FirebaseService';

const KEYS = {
    USER_PROFILE: 'userProfile',
    WORKOUTS: 'workouts',
    ACHIEVEMENTS: 'achievements',
    SETTINGS: 'settings',
    USER_ID: 'uniqueUserId',
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
};

function freshProfile() {
    return {
        ...INITIAL_PROFILE,
        createdDate: new Date().toISOString(),
    };
}

const DEFAULT_SETTINGS = {
    theme: 'dark',
};

function normalizeProfile(p) {
    if (!p) return freshProfile();
    return {
        ...INITIAL_PROFILE,
        ...p,
        createdDate: p.createdDate || new Date().toISOString(),
        bodyStats: { ...INITIAL_PROFILE.bodyStats, ...(p.bodyStats || {}) },
        customExercises: p.customExercises || [],
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

            return {
                profile,
                workouts: workoutsItem ? JSON.parse(workoutsItem) : [],
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
            
            FirebaseService.syncUserData(profile.uid, {
                name: profile.name,
                totalXP: profile.totalXP,
                level: profile.level,
                streak: profile.streak,
                bestStreak: profile.bestStreak,
                lastWorkoutDate: profile.lastWorkoutDate,
                workouts: workoutsStr ? JSON.parse(workoutsStr) : [],
                achievements: achievementsStr ? JSON.parse(achievementsStr) : []
            });
        }
    },

    async saveWorkoutsList(workouts) {
        await AsyncStorage.setItem(KEYS.WORKOUTS, JSON.stringify(workouts));
    },

    async saveAchievements(achievements) {
        await AsyncStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
    },

    /**
     * Persists new workout, profile, and merged achievements in one multiSet.
     */
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

        if (updatedProfile.uid) {
            FirebaseService.syncUserData(updatedProfile.uid, {
                name: updatedProfile.name,
                totalXP: updatedProfile.totalXP,
                level: updatedProfile.level,
                streak: updatedProfile.streak,
                bestStreak: updatedProfile.bestStreak,
                lastWorkoutDate: updatedProfile.lastWorkoutDate,
                workouts: newWorkouts,
                achievements: achievements
            });
        }

        return { workouts: newWorkouts, achievements };
    },

    async importCloudData(uid) {
        if (!uid) return null;
        const cloudData = await FirebaseService.fetchUserData(uid);
        if (cloudData) {
            const { workouts, achievements, ...profile } = cloudData;
            
            // Re-inject UID if missing in profile object but known from fetch
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

    async saveBodyStats(bodyStats) {
        const data = await this.loadAllData();
        const profile = { ...data.profile, bodyStats: { ...data.profile.bodyStats, ...bodyStats } };
        await this.saveUserProfile(profile);
        return profile;
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

    getWorkoutsSince(workouts, sinceDate) {
        const t = new Date(sinceDate).getTime();
        return workouts.filter((w) => new Date(w.date).getTime() >= t);
    },

    async clearAllData() {
        await AsyncStorage.clear();
    },
};
