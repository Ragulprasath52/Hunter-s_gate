export const ACHIEVEMENT_DEFINITIONS = [
    {
        id: 'first_workout',
        name: 'First Workout',
        description: 'Log your first workout.',
        requirement: 'Complete 1 workout log.',
        reqType: 'workouts',
        reqValue: 1,
    },
    {
        id: 'century_club',
        name: 'Century Club',
        description: 'Lift 100+ lbs in one set.',
        requirement: 'Log a set at 100 lbs or more.',
        reqType: 'weight_set',
        reqValue: 100,
    },
    {
        id: 'week_warrior',
        name: 'Week Warrior',
        description: 'Train 7 consecutive days.',
        requirement: 'Maintain a 7-day streak.',
        reqType: 'streak',
        reqValue: 7,
    },
    {
        id: 'personal_record',
        name: 'Personal Record',
        description: 'Hit a new max weight on any lift.',
        requirement: 'Break your previous best on an exercise.',
        reqType: 'has_pr',
        reqValue: 1,
    },
    {
        id: 'strength_ascension',
        name: 'Strength Ascension',
        description: 'Reach 1,000 lbs total volume lifted (lifetime).',
        requirement: 'Accumulate 1,000 lbs of total volume.',
        reqType: 'total_volume',
        reqValue: 1000,
    },
    {
        id: 'beast_mode',
        name: 'Beast Mode',
        description: 'Maintain a 30-day training streak.',
        requirement: 'Reach a 30-day streak.',
        reqType: 'streak',
        reqValue: 30,
    },
    {
        id: 'iron_will',
        name: 'Iron Will',
        description: 'Log 100 total workouts.',
        requirement: 'Complete 100 workout logs.',
        reqType: 'workouts',
        reqValue: 100,
    },
    {
        id: 'champion_level',
        name: 'Champion Level',
        description: 'Reach level 50.',
        requirement: 'Attain hunter level 50.',
        reqType: 'level',
        reqValue: 50,
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
