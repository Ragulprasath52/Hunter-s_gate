import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
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
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [exercise, setExercise] = useState(EXERCISES[0]);
    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('');
    const [sets, setSets] = useState('');
    const [intensity, setIntensity] = useState(5);
    const [durationMinutes, setDurationMinutes] = useState('');
    const [notes, setNotes] = useState('');

    const [recentWorkouts, setRecentWorkouts] = useState([]);
    const [profile, setProfile] = useState(null);
    const [workouts, setWorkouts] = useState([]);
    const [achievements, setAchievements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
            // Reset state
            setWeight('');
            setReps('');
            setSets('');
            setIntensity(5);
            setDurationMinutes('');
            setNotes('');
        }, [])
    );

    const loadData = async () => {
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
            console.error('Loader error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const levelInfo = useMemo(() => {
        if (!profile) return null;
        return calculateLevelProgress(profile.totalXP);
    }, [profile]);

    const muscleGroup = getMuscleGroupForExercise(exercise);

    const handleLogWorkout = async () => {
        // Set submitting state early to disable button
        setIsSubmitting(true);

        if (!weight || !reps || !sets) {
            Alert.alert('System Error', 'Weight, reps, and sets are required.');
            setIsSubmitting(false); // Reset submitting state on early exit
            return;
        }
        if (!profile) {
            Alert.alert('System Error', 'Hunter profile not loaded. Please wait or refresh.');
            setIsSubmitting(false); // Reset submitting state on early exit
            return;
        }

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
        const intensityNum = Math.min(10, Math.max(1, parseInt(intensity, 10) || 5)); // Added intensityNum calculation

        const { streak, bestStreak } = computeStreakAfterWorkout(profile);
        const xpGained = calculateWorkoutXP(vol, intensityNum, streak, isPR); // Used intensityNum

        const newTotalXP = profile.totalXP + xpGained;
        const levelData = calculateLevelProgress(newTotalXP);
        const oldLevel = calculateLevelProgress(profile.totalXP).level; // for future level up tracking

        const workout = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            exercise,
            weight: w,
            reps: r,
            sets: s,
            intensity: intensityNum, // Used intensityNum
            volume: vol,
            xpGained,
            isPR,
            durationMinutes: durationMinutes ? parseFloat(durationMinutes) : null,
            notes: notes.trim() || undefined,
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

        try {
            const { workouts: updated, achievements: updatedAchievements } = await StorageService.saveWorkout(workout, nextProfile, toUnlock);
            
            // Update local state immediately with results from save
            setRecentWorkouts(updated.slice(0, 5));
            setProfile(nextProfile);
            setWorkouts(updated);
            setAchievements(updatedAchievements);

            setShowSuccess(true); // Show success overlay

            setWeight('');
            setReps('');
            setSets('');
            setIntensity(5);
            setDurationMinutes('');
            setNotes('');
        } catch (error) {
            console.error('Save failed:', error);
            Alert.alert('Error', 'Failed to save workout. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteWorkout = (workoutToDelete) => {
        Alert.alert(
            "DELETE RECORD",
            `Do you want to erase this ${workoutToDelete.exercise} raid? You will lose ${workoutToDelete.xpGained} XP.`,
            [
                { text: "CANCEL", style: "cancel" },
                { 
                    text: "ERASE", 
                    style: "destructive",
                    onPress: async () => {
                        const newWorkouts = workouts.filter(w => w.id !== workoutToDelete.id);
                        await StorageService.saveWorkoutsList(newWorkouts);
                        
                        const newXP = Math.max(0, profile.totalXP - workoutToDelete.xpGained);
                        const levelData = calculateLevelProgress(newXP);
                        const newProfile = { ...profile, totalXP: newXP, level: levelData.level };
                        
                        await StorageService.saveUserProfile(newProfile);
                        
                        setWorkouts(newWorkouts);
                        setRecentWorkouts(newWorkouts.slice(0, 5));
                        setProfile(newProfile);
                    }
                }
            ]
        );
    };

    const availableExercises = useMemo(() => {
        const customs = profile?.customExercises || [];
        return [...EXERCISES, ...customs];
    }, [profile]);

    // Conditional rendering for loading state
    if (!profile || !levelInfo) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.primary, letterSpacing: 3, fontSize: 12 }}>INITIALIZING HUNTER SYSTEM...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FadeInView duration={400} style={{ flex: 1 }}>
                <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.primary }]}>⟨ LOG RAID ⟩</Text>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>Record your training. The system calculates XP.</Text>
                </View>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={[styles.formCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
                    
                    <Text style={[styles.label, { color: colors.textSecondary }]}>TARGET EXERCISE</Text>
                    <View style={[styles.pickerWrap, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                        <Picker
                            selectedValue={exercise}
                            onValueChange={setExercise}
                            dropdownIconColor={colors.primary}
                            style={[styles.picker, { color: colors.textPrimary }]}
                            itemStyle={Platform.OS === 'ios' ? { color: colors.textPrimary, fontSize: 16 } : undefined}
                            mode="dropdown"
                        >
                            {availableExercises.map((ex) => (
                                <Picker.Item 
                                    key={ex} 
                                    label={ex} 
                                    value={ex} 
                                    color={colors.textPrimary} 
                                />
                            ))}
                        </Picker>
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

                    <Text style={[styles.label, { color: colors.textSecondary }]}>INTENSITY TIER (1–10): <Text style={{ color: colors.warning, fontWeight: 'bold' }}>{Math.round(intensity)}</Text></Text>
                    <Slider
                        style={styles.slider}
                        minimumValue={1}
                        maximumValue={10}
                        step={1}
                        value={intensity}
                        onValueChange={setIntensity}
                        minimumTrackTintColor={colors.warning}
                        maximumTrackTintColor={colors.border}
                        thumbTintColor={colors.warning}
                    />

                    <Text style={[styles.label, { color: colors.textSecondary, marginTop: 8 }]}>DURATION (MIN) — optional</Text>
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
                            <TouchableOpacity 
                                activeOpacity={0.7} 
                                onLongPress={() => handleDeleteWorkout(w)}
                                style={[styles.historyCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, borderLeftColor: colors.primary }]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.historyName, { color: colors.primary }]}>{w.exercise}</Text>
                                    <Text style={[styles.historyStats, { color: colors.textPrimary }]}>
                                        {w.weight} kg × {w.reps} × {w.sets} · vol <Text style={{color: colors.warning}}>{Math.round(w.volume || 0)}</Text>
                                    </Text>
                                    <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{new Date(w.date).toLocaleString()} (Long press to delete)</Text>
                                </View>
                                <View style={[styles.historyXpBadge, { borderColor: colors.success, backgroundColor: colors.successGlow || colors.transparentSuccess }]}>
                                    <Text style={[styles.historyXpText, { color: colors.success }]}>+{w.xpGained} XP</Text>
                                </View>
                            </TouchableOpacity>
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
    pickerWrap: { borderWidth: 1, borderRadius: SIZES.radius, marginBottom: 10, overflow: 'hidden' },
    picker: { width: '100%', height: Platform.OS === 'ios' ? 120 : 50 },
    muscleLine: { fontSize: 11, letterSpacing: 1, marginBottom: 20, textAlign: 'right' },
    row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    inputGroup: { flex: 1 },
    input: { 
        borderWidth: 1, 
        padding: 12, 
        borderRadius: SIZES.radiusSm || 8, 
        fontSize: 18, 
        textAlign: 'center',
        fontWeight: 'bold',
    },
    inputFull: { 
        borderWidth: 1, 
        padding: 12, 
        borderRadius: SIZES.radiusSm || 8, 
        fontSize: 14, 
        marginBottom: 16 
    },
    notes: { 
        borderWidth: 1, 
        padding: 12, 
        borderRadius: SIZES.radiusSm || 8, 
        fontSize: 14, 
        minHeight: 80, 
        textAlignVertical: 'top', 
        marginBottom: 16 
    },
    slider: { width: '100%', height: 40, marginBottom: 8 },
    volumePreview: { fontSize: 13, marginBottom: 16, letterSpacing: 0.5 },
    submitBtn: { 
        borderWidth: 1, 
        padding: 16, 
        borderRadius: SIZES.radiusSm || 8, 
        alignItems: 'center', 
        marginTop: 4 
    },
    submitBtnText: { fontSize: 13, fontWeight: 'bold', letterSpacing: 2 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 14, letterSpacing: 2 },
    emptyText: { fontStyle: 'italic', textAlign: 'center', marginTop: 12, fontSize: 13 },
    historyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SIZES.padding,
        borderRadius: SIZES.radiusSm || 8,
        borderWidth: 1,
        borderLeftWidth: 4,
        marginBottom: 10,
    },
    historyName: { fontWeight: 'bold', fontSize: 16, marginBottom: 4, letterSpacing: 1 },
    historyStats: { fontSize: 12, marginBottom: 4 },
    historyDate: { fontSize: 10, letterSpacing: 0.5 },
    historyXpBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, marginLeft: 8 },
    historyXpText: { fontWeight: 'bold', fontSize: 12 },
});
