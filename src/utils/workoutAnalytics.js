export function startOfWeek(d) {
    const x = new Date(d);
    const day = x.getDay();
    const diff = (day + 6) % 7;
    x.setDate(x.getDate() - diff);
    x.setHours(0, 0, 0, 0);
    return x;
}

export function startOfMonth(d) {
    const x = new Date(d);
    x.setDate(1);
    x.setHours(0, 0, 0, 0);
    return x;
}

export function weekKey(date) {
    const s = startOfWeek(date);
    return s.toISOString().slice(0, 10);
}

export function parseDay(dateIso) {
    const d = new Date(dateIso);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/** Last `weeks` weeks, Mon–Sun buckets with total volume per week. */
export function weeklyVolumeSeries(workouts, weeks = 8) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - weeks * 7);
    start.setHours(0, 0, 0, 0);

    const labels = [];
    const values = [];
    for (let i = 0; i < weeks; i++) {
        const wkStart = new Date(start);
        wkStart.setDate(wkStart.getDate() + i * 7);
        const wkEnd = new Date(wkStart);
        wkEnd.setDate(wkEnd.getDate() + 7);
        let vol = 0;
        for (const w of workouts) {
            const t = new Date(w.date).getTime();
            if (t >= wkStart.getTime() && t < wkEnd.getTime()) {
                vol += Number(w.volume) || 0;
            }
        }
        labels.push(`W${i + 1}`);
        values.push(vol);
    }
    return { labels, values };
}

/** Per-week max weight for bench, squat, deadlift (last `weeks` weeks). */
export function bigThreeMaxByWeek(workouts, weeks = 10) {
    const lifts = ['Bench Press', 'Squat', 'Deadlift'];
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - weeks * 7);
    start.setHours(0, 0, 0, 0);

    const labels = [];
    const bench = [];
    const squat = [];
    const deadlift = [];

    for (let i = 0; i < weeks; i++) {
        const wkStart = new Date(start);
        wkStart.setDate(wkStart.getDate() + i * 7);
        const wkEnd = new Date(wkStart);
        wkEnd.setDate(wkEnd.getDate() + 7);
        labels.push(`${wkStart.getMonth() + 1}/${wkStart.getDate()}`);

        const maxFor = (name) => {
            let m = 0;
            for (const w of workouts) {
                if (w.exercise !== name) continue;
                const t = new Date(w.date).getTime();
                if (t >= wkStart.getTime() && t < wkEnd.getTime()) {
                    m = Math.max(m, Number(w.weight) || 0);
                }
            }
            return m;
        };

        bench.push(maxFor('Bench Press'));
        squat.push(maxFor('Squat'));
        deadlift.push(maxFor('Deadlift'));
    }

    return { labels, bench, squat, deadlift };
}

const MUSCLE_BY_EXERCISE = {
    // Falls back to these for old data
    'Bench Press': { main: 'chest', sub: 'triceps' },
    'Squat': { main: 'legs', sub: 'back' },
    'Deadlift': { main: 'back', sub: 'legs' },
    'Barbell Row': { main: 'back', sub: 'biceps' },
    'Pull-ups': { main: 'back', sub: 'biceps' },
    'Dumbbell Curls': { main: 'arms', sub: 'arms' },
    'Leg Press': { main: 'legs', sub: 'legs' },
    'Chest Flies': { main: 'chest', sub: 'shoulders' },
    'Overhead Press': { main: 'shoulders', sub: 'triceps' },
    'Lat Pulldown': { main: 'back', sub: 'biceps' },
    'Tricep Pushdown': { main: 'arms', sub: 'triceps' },
    'Pushups': { main: 'chest', sub: 'triceps' },
    'Plank': { main: 'core', sub: 'back' },
    'Lunges': { main: 'legs', sub: 'glutes' },
};

function maskMuscle(m) {
    if (!m) return 'arms';
    const low = m.toLowerCase();
    if (low.includes('chest')) return 'chest';
    if (low.includes('back')) return 'back';
    if (low.includes('leg') || low.includes('glute')) return 'legs';
    if (low.includes('arm') || low.includes('bicep') || low.includes('tricep')) return 'arms';
    if (low.includes('shoulder')) return 'shoulders';
    if (low.includes('core') || low.includes('abs')) return 'core';
    if (low.includes('trap')) return 'back';
    return 'arms'; // default
}

export function muscleVolumeTotals(workouts) {
    const keys = ['chest', 'back', 'legs', 'arms', 'shoulders', 'core'];
    const totals = Object.fromEntries(keys.map((k) => [k, 0]));
    
    for (const w of workouts) {
        const volume = Number(w.volume) || 0;
        
        let rawMain = w.mainMuscle;
        let rawSub = w.subMuscle;
        
        if (!rawMain) {
            const entry = MUSCLE_BY_EXERCISE[w.exercise];
            rawMain = entry?.main || 'arms';
            rawSub = entry?.sub || rawMain;
        }

        const main = maskMuscle(rawMain);
        const sub = maskMuscle(rawSub);

        if (main === sub) {
            totals[main] = (totals[main] || 0) + volume;
        } else {
            // Split 70% to main, 30% to sub
            totals[main] = (totals[main] || 0) + (volume * 0.7);
            if (totals[sub] !== undefined) {
                totals[sub] = (totals[sub] || 0) + (volume * 0.3);
            } else {
                // If masked sub still not in totals (unlikely with mask), 
                // just give it to main
                totals[main] = (totals[main] || 0) + (volume * 0.3);
            }
        }
    }
    return keys.map((k) => totals[k] || 0);
}

export function getMuscleGroupForExercise(exercise) {
    const entry = MUSCLE_BY_EXERCISE[exercise];
    const main = entry?.main || 'General';
    return main.charAt(0).toUpperCase() + main.slice(1);
}

/** GitHub-style grid: rows = Mon–Sun, cols = weeks (left = older). Count workouts per day. */
export function buildHeatmapGrid(workouts, numWeeks = 12) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - (numWeeks * 7 - 1));
    start.setHours(0, 0, 0, 0);
    while (start.getDay() !== 1) {
        start.setDate(start.getDate() - 1);
    }

    const dayCounts = new Map();
    for (const w of workouts) {
        const k = parseDay(w.date);
        dayCounts.set(k, (dayCounts.get(k) || 0) + 1);
    }

    const cols = numWeeks;
    const rows = 7;
    const grid = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            const cell = new Date(start);
            cell.setDate(cell.getDate() + c * 7 + r);
            cell.setHours(0, 0, 0, 0);
            const count = dayCounts.get(cell.getTime()) || 0;
            row.push({ date: cell, count });
        }
        grid.push(row);
    }
    return { grid, start, end: today };
}

export function monthStats(workouts, anchor = new Date()) {
    const thisStart = startOfMonth(anchor);
    const nextStart = new Date(thisStart);
    nextStart.setMonth(nextStart.getMonth() + 1);
    const prevStart = new Date(thisStart);
    prevStart.setMonth(prevStart.getMonth() - 1);

    const inRange = (w, a, b) => {
        const t = new Date(w.date).getTime();
        return t >= a.getTime() && t < b.getTime();
    };

    let thisVol = 0;
    let thisCount = 0;
    let prevVol = 0;
    let prevCount = 0;

    for (const w of workouts) {
        if (inRange(w, thisStart, nextStart)) {
            thisVol += Number(w.volume) || 0;
            thisCount += 1;
        } else if (inRange(w, prevStart, thisStart)) {
            prevVol += Number(w.volume) || 0;
            prevCount += 1;
        }
    }

    return {
        thisMonth: { volume: thisVol, workouts: thisCount },
        lastMonth: { volume: prevVol, workouts: prevCount },
    };
}

export function getWorkoutsSince(workouts, sinceDate) {
    const t = new Date(sinceDate).getTime();
    return workouts.filter((w) => new Date(w.date).getTime() >= t);
}

export function totalHoursTrained(workouts) {
    let m = 0;
    for (const w of workouts) {
        if (w.durationMinutes != null && !Number.isNaN(Number(w.durationMinutes))) {
            m += Number(w.durationMinutes);
        } else {
            m += 45;
        }
    }
    return m / 60;
}

export function bestLiftWithDate(workouts, exerciseName) {
    let best = 0;
    let date = null;
    for (const w of workouts) {
        if (w.exercise !== exerciseName) continue;
        const wt = Number(w.weight) || 0;
        if (wt > best) {
            best = wt;
            date = w.date;
        }
    }
    return { weight: best, date };
}

export function weekOverWeekSummary(workouts) {
    const now = new Date();
    const startThis = startOfWeek(now);
    const startLast = new Date(startThis);
    startLast.setDate(startLast.getDate() - 7);
    const endThis = new Date(startThis);
    endThis.setDate(endThis.getDate() + 7);

    let volThis = 0;
    let volLast = 0;
    let countThis = 0;
    let countLast = 0;
    let intSumThis = 0;
    let intSumLast = 0;

    for (const w of workouts) {
        const t = new Date(w.date).getTime();
        const inten = Number(w.intensity) || 0;
        if (t >= startThis.getTime() && t < endThis.getTime()) {
            volThis += Number(w.volume) || 0;
            countThis += 1;
            intSumThis += inten;
        } else if (t >= startLast.getTime() && t < startThis.getTime()) {
            volLast += Number(w.volume) || 0;
            countLast += 1;
            intSumLast += inten;
        }
    }

    return {
        thisWeek: {
            volume: volThis,
            workouts: countThis,
            avgIntensity: countThis ? intSumThis / countThis : 0,
        },
        lastWeek: {
            volume: volLast,
            workouts: countLast,
            avgIntensity: countLast ? intSumLast / countLast : 0,
        },
    };
}
