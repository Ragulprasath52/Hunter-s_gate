/**
 * Solo Leveling themed achievement system.
 * Each achievement belongs to a Hunter Rank league.
 */

export const HUNTER_LEAGUES = [
    { rank: 'E-Rank', title: 'Awakened Hunter', color: '#6b7280', glow: '#4b5563', icon: '🗡️', description: 'Every hunter starts at E-Rank. Complete these trials to prove your worth.' },
    { rank: 'D-Rank', title: 'Rising Hunter', color: '#22c55e', glow: '#16a34a', icon: '⚔️', description: 'You are no longer a novice. The system acknowledges your growing power.' },
    { rank: 'C-Rank', title: 'Elite Hunter', color: '#3b82f6', glow: '#2563eb', icon: '🛡️', description: 'Only the strong reach C-Rank. Your dedication is being noticed.' },
    { rank: 'B-Rank', title: 'Shadow Soldier', color: '#a855f7', glow: '#9333ea', icon: '👤', description: 'The shadows recognize your strength. You are becoming unstoppable.' },
    { rank: 'A-Rank', title: 'National Level', color: '#f59e0b', glow: '#d97706', icon: '🔥', description: 'A-Rank hunters are legends. Nations bow to your power.' },
    { rank: 'S-Rank', title: 'Shadow Monarch', color: '#ef4444', glow: '#dc2626', icon: '👑', description: 'The pinnacle of power. You have transcended all limits.' },
];

export const ACHIEVEMENT_DEFINITIONS = [
    // ── E-Rank League (Awakened Hunter) ──
    {
        id: 'first_workout',
        name: 'System Awakening',
        description: 'Begin your journey as a hunter. Log your first workout.',
        requirement: 'Complete 1 workout log.',
        reqType: 'workouts',
        reqValue: 1,
        league: 'E-Rank',
    },
    {
        id: 'century_club',
        name: 'Century Gate',
        description: 'Clear a gate with 50+ kg in one lift.',
        requirement: 'Log a set at 50 kg or more.',
        reqType: 'weight_set',
        reqValue: 50,
        league: 'E-Rank',
    },

    // ── D-Rank League (Rising Hunter) ──
    {
        id: 'week_warrior',
        name: 'Dungeon Streak',
        description: 'Survive the dungeon for 7 consecutive days.',
        requirement: 'Maintain a 7-day streak.',
        reqType: 'streak',
        reqValue: 7,
        league: 'D-Rank',
    },
    {
        id: 'personal_record',
        name: 'Power Surge',
        description: 'Break through your limits with a new personal best.',
        requirement: 'Break your previous best on any exercise.',
        reqType: 'has_pr',
        reqValue: 1,
        league: 'D-Rank',
    },

    // ── C-Rank League (Elite Hunter) ──
    {
        id: 'strength_ascension',
        name: 'Gate Breaker',
        description: 'Accumulate 500 kg of total volume across all raids.',
        requirement: 'Accumulate 500 kg of total volume.',
        reqType: 'total_volume',
        reqValue: 500,
        league: 'C-Rank',
    },
    {
        id: 'ten_workouts',
        name: 'Raid Veteran',
        description: 'Complete 10 dungeon raids to prove your consistency.',
        requirement: 'Complete 10 workout logs.',
        reqType: 'workouts',
        reqValue: 10,
        league: 'C-Rank',
    },

    // ── B-Rank League (Shadow Soldier) ──
    {
        id: 'beast_mode',
        name: 'Shadow Extract',
        description: 'Your will is unbreakable. Maintain a 30-day training streak.',
        requirement: 'Reach a 30-day streak.',
        reqType: 'streak',
        reqValue: 30,
        league: 'B-Rank',
    },
    {
        id: 'volume_king',
        name: 'Monarch\'s Strength',
        description: 'Accumulate 25,000 kg of total volume.',
        requirement: 'Reach 25,000 kg lifetime volume.',
        reqType: 'total_volume',
        reqValue: 25000,
        league: 'B-Rank',
    },

    // ── A-Rank League (National Level) ──
    {
        id: 'iron_will',
        name: 'Iron Will',
        description: 'Log 100 total raids. Your dedication is unmatched.',
        requirement: 'Complete 100 workout logs.',
        reqType: 'workouts',
        reqValue: 100,
        league: 'A-Rank',
    },
    {
        id: 'two_plate_club',
        name: 'Double Gate Clear',
        description: 'Lift 100+ kg in a single set. True A-Rank power.',
        requirement: 'Log a set at 100 kg or more.',
        reqType: 'weight_set',
        reqValue: 100,
        league: 'A-Rank',
    },

    // ── S-Rank League (Shadow Monarch) ──
    {
        id: 'champion_level',
        name: 'Shadow Monarch',
        description: 'Reach level 50. You have transcended all hunters.',
        requirement: 'Attain hunter level 50.',
        reqType: 'level',
        reqValue: 50,
        league: 'S-Rank',
    },
    {
        id: 'ultimate_volume',
        name: 'Arise',
        description: 'Accumulate 100,000 kg of total volume. The system bows to you.',
        requirement: 'Reach 100,000 kg lifetime volume.',
        reqType: 'total_volume',
        reqValue: 100000,
        league: 'S-Rank',
    },
];

export function mergeAchievementState(storedList) {
    const byId = new Map((storedList || []).map((a) => [a.id, a]));
    return ACHIEVEMENT_DEFINITIONS.map((def) => {
        const prev = byId.get(def.id);
        return {
            ...def,
            unlocked: prev?.unlocked ?? false,
            date: prev?.date ?? null,
        };
    });
}
