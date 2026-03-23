/**
 * Level 1 at 0 XP. To reach level L+1 from L requires L * 300 XP (L=1 → 300 to L2).
 * Max level 100.
 */
export function calculateLevelProgress(totalXP) {
    let level = 1;
    let xpRemaining = totalXP;
    let xpForNextLevel = 300;

    while (level < 100 && xpRemaining >= xpForNextLevel) {
        xpRemaining -= xpForNextLevel;
        level += 1;
        xpForNextLevel = level * 300;
    }

    if (level >= 100) {
        return {
            level: 100,
            currentLevelXP: 0,
            xpRequiredForNextLevel: 1,
            progress: 1,
        };
    }

    return {
        level,
        currentLevelXP: Math.floor(xpRemaining),
        xpRequiredForNextLevel: xpForNextLevel,
        progress: xpForNextLevel > 0 ? xpRemaining / xpForNextLevel : 0,
    };
}
