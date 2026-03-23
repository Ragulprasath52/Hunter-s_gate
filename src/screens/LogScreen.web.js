/**
 * Web: avoid @react-native-picker/picker + community slider (often break RN-web on load).
 */
import React, { useState, useCallback, useMemo } from 'react';
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

    const availableExercises = useMemo(() => {
        const customs = profile?.customExercises || [];
        return [...EXERCISES, ...customs];
    }, [profile]);

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
                    <Text style={[styles.title, { color: colors.primary }]}>⟨ LOG RAID ⟩</Text>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>Pick exercise below · set intensity 1–10</Text>
                </View>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                <View style={[styles.formCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
                    
                    <Text style={[styles.label, { color: colors.textSecondary }]}>TARGET EXERCISE</Text>
                    <View style={styles.exerciseGrid}>
                        {availableExercises.map((ex) => (
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
                            <Text style={[styles.label, { color: colors.textSecondary }]}>WEIGHT (KG)</Text>
                            <TextInput
                                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.primary }]}
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
                                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.primary }]}
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
                                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.primary }]}
                                value={sets}
                                onChangeText={setSets}
                                keyboardType="number-pad"
                                placeholderTextColor={colors.textSecondary}
                                placeholder="0"
                            />
                        </View>
                    </View>

                    <Text style={[styles.label, { color: colors.textSecondary }]}>INTENSITY TIER (1–10)</Text>
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
                        <Text style={{ color: colors.warning, fontWeight: 'bold', fontSize: 16 }}>
                            {weight && reps && sets ? `${(parseFloat(weight) || 0) * (parseInt(reps, 10) || 0) * (parseInt(sets, 10) || 0)} kg` : '—'}
                        </Text>
                    </Text>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={[
                            styles.submitBtn,
                            { borderColor: colors.primary, backgroundColor: colors.primaryGlow || colors.transparentPrimary },
                            isSubmitting && { opacity: 0.5 }
                        ]}
                        onPress={handleLogWorkout}
                        disabled={isSubmitting || isLoading}
                    >
                        <Text style={[styles.submitBtnText, { color: colors.primary }]}>
                            {isSubmitting ? 'SYNCING...' : 'RECORD RAID ✦'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>⟨ RECENT HISTORY ⟩</Text>
                {recentWorkouts.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No workout history yet. The dungeon awaits.</Text>
                ) : (
                    recentWorkouts.map((w) => (
                        <FadeInView key={w.id} delay={100}>
                            <View style={[styles.historyCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, borderLeftColor: colors.primary }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.historyName, { color: colors.primary }]}>{w.exercise}</Text>
                                    <Text style={[styles.historyStats, { color: colors.textPrimary }]}>
                                        {w.weight} kg × {w.reps} × {w.sets} · vol <Text style={{color: colors.warning}}>{Math.round(w.volume || 0)}</Text>
                                    </Text>
                                    <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{new Date(w.date).toLocaleString()}</Text>
                                </View>
                                <View style={[styles.historyXpBadge, { borderColor: colors.success, backgroundColor: colors.successGlow || colors.transparentSuccess }]}>
                                    <Text style={[styles.historyXpText, { color: colors.success }]}>+{w.xpGained} XP</Text>
                                </View>
                            </View>
                        </FadeInView>
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
    title: { fontSize: 20, fontWeight: 'bold', letterSpacing: 3, marginBottom: 4 },
    hint: { fontSize: 11, marginTop: 4, paddingHorizontal: 24, textAlign: 'center', letterSpacing: 1 },
    content: { flex: 1, padding: SIZES.padding },
    formCard: {
        padding: SIZES.padding,
        borderRadius: SIZES.radiusLg || 12,
        borderWidth: 1,
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
    },
    glowLineTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
    },
    label: { fontSize: 10, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },
    exerciseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    exChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    exChipText: { fontSize: 13 },
    muscleLine: { fontSize: 11, letterSpacing: 1, marginBottom: 20, textAlign: 'right' },
    row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    inputGroup: { flex: 1 },
    input: {
        borderWidth: 1,
        borderRadius: SIZES.radiusSm || 8,
        padding: 12,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    inputFull: {
        borderWidth: 1,
        borderRadius: SIZES.radiusSm || 8,
        padding: 12,
        fontSize: 14,
        marginBottom: 16,
    },
    notes: {
        borderWidth: 1,
        borderRadius: SIZES.radiusSm || 8,
        padding: 12,
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    volumePreview: {
        fontSize: 13,
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    submitBtn: {
        borderWidth: 1,
        padding: 16,
        borderRadius: SIZES.radiusSm || 8,
        alignItems: 'center',
        marginTop: 4,
    },
    submitBtnText: {
        fontSize: 13,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 14,
        letterSpacing: 2,
    },
    emptyText: {
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 12,
        fontSize: 13,
    },
    historyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SIZES.padding,
        borderRadius: SIZES.radiusSm || 8,
        borderWidth: 1,
        borderLeftWidth: 4,
        marginBottom: 10,
    },
    historyName: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 4,
        letterSpacing: 1,
    },
    historyStats: {
        fontSize: 12,
        marginBottom: 4,
    },
    historyDate: {
        fontSize: 10,
        letterSpacing: 0.5,
    },
    historyXpBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        marginLeft: 8,
    },
    historyXpText: {
        fontWeight: 'bold',
        fontSize: 12,
    },
});
