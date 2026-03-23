import { calculateLevelProgress } from './levelMath';

export { calculateLevelProgress };

export function calculateLevel(totalXP) {
    return calculateLevelProgress(totalXP).level;
}

/** Sync level field from total XP (call after XP changes). */
export function updateUserStats(profile) {
    const level = calculateLevelProgress(profile.totalXP || 0).level;
    return { ...profile, level };
}

/** Streak multiplier: 1x below 7 days; 1.5x at 7d → 2x at 30d. */
export function getStreakMultiplier(streakDays) {
    if (streakDays < 7) return 1;
    const t = Math.min(streakDays, 30);
    return 1.5 + ((t - 7) / 23) * 0.5;
}

/**
 * XP: base = 100 + volume/100 + intensity*10; +200 if PR; × streak multiplier.
 */
export function calculateWorkoutXP(volume, intensity, streakDays, isPR) {
    let base = 100 + volume / 100 + intensity * 10;
    if (isPR) base += 200;
    base *= getStreakMultiplier(streakDays);
    return Math.floor(base);
}

export function getRank(level) {
    if (level <= 10) return 'E-Rank';
    if (level <= 20) return 'D-Rank';
    if (level <= 35) return 'C-Rank';
    if (level <= 55) return 'B-Rank';
    if (level <= 75) return 'A-Rank';
    return 'S-Rank';
}

export function computeStreakAfterWorkout(profile, workoutDate = new Date()) {
    const today = new Date(workoutDate).toDateString();
    const lastRaw = profile.lastWorkoutDate;
    const lastDate = lastRaw ? new Date(lastRaw).toDateString() : null;

    if (lastDate === today) {
        return { streak: profile.streak, bestStreak: profile.bestStreak };
    }

    const y = new Date(workoutDate);
    y.setDate(y.getDate() - 1);
    const yesterday = y.toDateString();

    let streak = 1;
    if (lastDate === yesterday) {
        streak = (profile.streak || 0) + 1;
    } else if (lastDate === null) {
        streak = 1;
    } else {
        streak = 1;
    }

    const bestStreak = Math.max(profile.bestStreak || 0, streak);
    return { streak, bestStreak };
}

export function getPreviousMaxWeight(workouts, exercise, excludeId) {
    let max = 0;
    for (const w of workouts) {
        if (w.exercise !== exercise) continue;
        if (excludeId && w.id === excludeId) continue;
        const wt = Number(w.weight) || 0;
        if (wt > max) max = wt;
    }
    return max;
}

function totalVolume(workouts) {
    return workouts.reduce((s, w) => s + (Number(w.volume) || 0), 0);
}

function hasAnyPR(workouts) {
    return workouts.some((w) => w.isPR);
}

/** Progress 0–1 toward requirement for locked achievements. */
export function getAchievementProgress(ach, profile, workouts) {
    const level = calculateLevelProgress(profile.totalXP || 0).level;
    const n = workouts.length;
    const vol = totalVolume(workouts);
    const streak = profile.streak || 0;

    switch (ach.reqType) {
        case 'workouts':
            return Math.min(1, n / ach.reqValue);
        case 'streak':
            return Math.min(1, streak / ach.reqValue);
        case 'level':
            return Math.min(1, level / ach.reqValue);
        case 'weight_set': {
            const maxW = Math.max(0, ...workouts.map((w) => Number(w.weight) || 0));
            return Math.min(1, maxW / ach.reqValue);
        }
        case 'total_volume':
            return Math.min(1, vol / ach.reqValue);
        case 'has_pr':
            return hasAnyPR(workouts) ? 1 : 0;
        default:
            return 0;
    }
}

export function isAchievementUnlocked(ach, profile, workouts) {
    return getAchievementProgress(ach, profile, workouts) >= 1;
}

/** Returns achievement ids that should be unlocked (not yet unlocked). */
export function checkAchievements(profile, workouts, achievementList) {
    const toUnlock = [];
    for (const ach of achievementList) {
        if (ach.unlocked) continue;
        if (isAchievementUnlocked(ach, profile, workouts)) {
            toUnlock.push(ach.id);
        }
    }
    return toUnlock;
}
