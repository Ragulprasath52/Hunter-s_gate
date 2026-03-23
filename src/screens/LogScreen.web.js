/**
 * Web: avoid @react-native-picker/picker + community slider (often break RN-web on load).
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../services/StorageService';
import {
    calculateWorkoutXP,
    calculateLevelProgress,
    computeStreakAfterWorkout,
    getPreviousMaxWeight,
    checkAchievements,
} from '../utils/gameLogic';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { getMuscleGroupForExercise } from '../utils/workoutAnalytics';
import FadeInView from '../components/FadeInView';
import SuccessOverlay from '../components/SuccessOverlay';

const EXERCISES = [
    'Bench Press',
    'Squat',
    'Deadlift',
    'Barbell Row',
    'Pull-ups',
    'Dumbbell Curls',
    'Leg Press',
    'Chest Flies',
    'Overhead Press',
    'Lat Pulldown',
    'Tricep Pushdown',
];

export default function LogScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [exercise, setExercise] = useState(EXERCISES[0]);
    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('');
    const [sets, setSets] = useState('');
    const [intensity, setIntensity] = useState('5');
    const [durationMinutes, setDurationMinutes] = useState('');
    const [notes, setNotes] = useState('');

    const [recentWorkouts, setRecentWorkouts] = useState([]);
    const [profile, setProfile] = useState(null);
    const [workouts, setWorkouts] = useState([]);
    const [achievements, setAchievements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await StorageService.loadAllData();
            if (data) {
                setRecentWorkouts(data.workouts.slice(0, 5));
                setProfile(data.profile);
                setWorkouts(data.workouts);
                setAchievements(data.achievements);
            }
        } catch (e) {
            console.error('Core Web-System Storage Error:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const muscleGroup = getMuscleGroupForExercise(exercise);
    const intensityNum = Math.min(10, Math.max(1, parseInt(intensity, 10) || 5));

    const handleLogWorkout = async () => {
        if (!weight || !reps || !sets) {
            Alert.alert('System Error', 'Weight, reps, and sets are required.');
            return;
        }
        if (!profile) {
            Alert.alert('System Error', 'Hunter profile not loaded. Please wait or refresh.');
            return;
        }

        setIsSubmitting(true);
        try {
            const w = parseFloat(weight);
            const r = parseInt(reps, 10);
            const s = parseInt(sets, 10);
            if (Number.isNaN(w) || Number.isNaN(r) || Number.isNaN(s)) {
                Alert.alert('System Error', 'Enter valid numbers.');
                setIsSubmitting(false);
                return;
            }

            const vol = w * r * s;
            const prevMax = getPreviousMaxWeight(workouts, exercise);
            const isPR = w > prevMax;

            const { streak, bestStreak } = computeStreakAfterWorkout(profile);
            const xpGained = calculateWorkoutXP(vol, intensityNum, streak, isPR);

            const newTotalXP = (profile.totalXP || 0) + xpGained;
            const levelData = calculateLevelProgress(newTotalXP);

            const workout = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                exercise,
                muscleGroup,
                weight: w,
                reps: r,
                sets: s,
                intensity: intensityNum,
                volume: vol,
                xpGained,
                isPR,
                durationMinutes: parseFloat(durationMinutes) || 0,
                notes,
            };

            const nextProfile = {
                ...profile,
                totalXP: newTotalXP,
                level: levelData.level,
                streak,
                bestStreak,
                lastWorkoutDate: workout.date,
            };

            const combinedWorkouts = [workout, ...workouts];
            const toUnlock = checkAchievements(nextProfile, combinedWorkouts, achievements);

            const { workouts: updated, achievements: updatedAchievements } = await StorageService.saveWorkout(workout, nextProfile, toUnlock);
            
            setRecentWorkouts(updated.slice(0, 5));
            setProfile(nextProfile);
            setWorkouts(updated);
            setAchievements(updatedAchievements);
            setShowSuccess(true);

            setWeight('');
            setReps('');
            setSets('');
            setIntensity('5');
            setDurationMinutes('');
            setNotes('');
        } catch (error) {
            console.error('System Save Error:', error);
            Alert.alert('System Error', 'Sync failed. System log: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!profile) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.primary }}>INITIALIZING HUNTER SYSTEM (WEB)...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FadeInView duration={400} style={{ flex: 1 }}>
                <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.primary }]}>LOG WORKOUT</Text>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>Web · pick exercise below, set intensity 1–10.</Text>
                </View>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                <View style={[styles.formCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>EXERCISE</Text>
                    <View style={styles.exerciseGrid}>
                        {EXERCISES.map((ex) => (
                            <TouchableOpacity
                                key={ex}
                                style={[styles.exChip, { borderColor: colors.border, backgroundColor: colors.background }, exercise === ex && { borderColor: colors.primary, backgroundColor: colors.transparentPrimary }]}
                                onPress={() => setExercise(ex)}
                            >
                                <Text style={[styles.exChipText, { color: colors.textSecondary }, exercise === ex && { color: colors.primary, fontWeight: 'bold' }]}>{ex}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.muscleLine, { color: colors.success }]}>
                        Muscle group: <Text style={{ fontWeight: 'bold' }}>{muscleGroup}</Text>
                    </Text>

                    <View style={styles.row}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>WEIGHT (LBS)</Text>
                            <TextInput
                                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
                                value={weight}
                                onChangeText={setWeight}
                                keyboardType="decimal-pad"
                                placeholderTextColor={colors.textSecondary}
                                placeholder="0"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>REPS</Text>
                            <TextInput
                                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
                                value={reps}
                                onChangeText={setReps}
                                keyboardType="number-pad"
                                placeholderTextColor={colors.textSecondary}
                                placeholder="0"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>SETS</Text>
                            <TextInput
                                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
                                value={sets}
                                onChangeText={setSets}
                                keyboardType="number-pad"
                                placeholderTextColor={colors.textSecondary}
                                placeholder="0"
                            />
                        </View>
                    </View>

                    <Text style={[styles.label, { color: colors.textSecondary }]}>INTENSITY (1–10)</Text>
                    <TextInput
                        style={[styles.inputFull, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
                        value={intensity}
                        onChangeText={setIntensity}
                        keyboardType="number-pad"
                        maxLength={2}
                        placeholderTextColor={colors.textSecondary}
                        placeholder="5"
                    />

                    <Text style={[styles.label, { color: colors.textSecondary }]}>DURATION (MIN) — optional</Text>
                    <TextInput
                        style={[styles.inputFull, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
                        value={durationMinutes}
                        onChangeText={setDurationMinutes}
                        keyboardType="decimal-pad"
                        placeholderTextColor={colors.textSecondary}
                        placeholder="e.g. 45"
                    />

                    <Text style={[styles.label, { color: colors.textSecondary }]}>NOTES — optional</Text>
                    <TextInput
                        style={[styles.notes, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholderTextColor={colors.textSecondary}
                        placeholder="Form cues, pain, PR attempt..."
                        multiline
                    />

                    <Text style={[styles.volumePreview, { color: colors.textPrimary }]}>
                        Session volume:{' '}
                        <Text style={{ color: colors.warning, fontWeight: 'bold' }}>
                            {weight && reps && sets ? `${(parseFloat(weight) || 0) * (parseInt(reps, 10) || 0) * (parseInt(sets, 10) || 0)} lbs` : '—'}
                        </Text>
                    </Text>

                    <TouchableOpacity
                        style={[styles.submitBtn, { borderColor: colors.success, backgroundColor: colors.transparentSuccess }, isSubmitting && { opacity: 0.5 }]}
                        onPress={handleLogWorkout}
                        disabled={isSubmitting || isLoading}
                    >
                        <Text style={[styles.submitBtnText, { color: colors.success }]}>
                            {isSubmitting ? 'SYNCING...' : 'LOG WORKOUT'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>RECENT WORKOUTS</Text>
                {recentWorkouts.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No workout history yet. Start your ascension.</Text>
                ) : (
                    recentWorkouts.map((w) => (
                        <TouchableOpacity key={w.id}>
                            <View style={[styles.historyCard, { backgroundColor: colors.backgroundSecondary, borderLeftColor: colors.primary }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.historyName, { color: colors.primary }]}>{w.exercise}</Text>
                                    <Text style={[styles.historyStats, { color: colors.textPrimary }]}>
                                        {w.weight} lbs × {w.reps} × {w.sets} · vol {Math.round(w.volume || 0)}
                                    </Text>
                                    <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{new Date(w.date).toLocaleString()}</Text>
                                </View>
                                <View style={[styles.historyXpBadge, { borderColor: colors.success, backgroundColor: colors.transparentSuccess }]}>
                                    <Text style={[styles.historyXpText, { color: colors.success }]}>+{w.xpGained} XP</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
                <View style={{ height: 48 }} />
            </ScrollView>
            </FadeInView>

            <SuccessOverlay visible={showSuccess} onAnimationEnd={() => setShowSuccess(false)} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingBottom: 14,
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    title: { fontSize: 20, fontWeight: 'bold', letterSpacing: 2 },
    hint: { fontSize: 11, marginTop: 6, paddingHorizontal: 24, textAlign: 'center' },
    content: { flex: 1, padding: SIZES.padding },
    formCard: {
        padding: SIZES.padding,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        marginBottom: 24,
    },
    label: { fontSize: SIZES.fontSmall, marginBottom: 8, letterSpacing: 1 },
    exerciseGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
    exChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        marginRight: 6,
        marginBottom: 6,
    },
    exChipText: { fontSize: 11 },
    muscleLine: { fontSize: 13, marginBottom: 16 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    inputGroup: { flex: 1, marginHorizontal: 4, marginBottom: 12 },
    input: { borderWidth: 1, padding: 12, borderRadius: SIZES.radius, fontSize: 16, textAlign: 'center' },
    inputFull: { borderWidth: 1, padding: 12, borderRadius: SIZES.radius, fontSize: 16, marginBottom: 12 },
    notes: { borderWidth: 1, padding: 12, borderRadius: SIZES.radius, fontSize: 14, minHeight: 72, textAlignVertical: 'top', marginBottom: 12 },
    volumePreview: { fontSize: 14, marginBottom: 12 },
    submitBtn: { borderWidth: 1, padding: 16, borderRadius: SIZES.radius, alignItems: 'center', marginTop: 4 },
    submitBtnText: { fontSize: SIZES.fontMedium, fontWeight: 'bold', letterSpacing: 2 },
    sectionTitle: { fontSize: SIZES.fontMedium, fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 },
    emptyText: { fontStyle: 'italic', textAlign: 'center', marginTop: 12 },
    historyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SIZES.padding,
        borderRadius: SIZES.radius,
        borderLeftWidth: 3,
        marginBottom: 10,
    },
    historyName: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
    historyStats: { fontSize: 12, marginBottom: 4 },
    historyDate: { fontSize: 10 },
    historyXpBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, marginLeft: 8 },
    historyXpText: { fontWeight: 'bold', fontSize: 12 },
});
