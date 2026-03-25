import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Platform, Modal, FlatList, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../services/StorageService';
import {
    calculateWorkoutXP,
    calculateLevelProgress,
    checkAchievements,
} from '../utils/gameLogic';
import { InventoryService } from '../services/InventoryService';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import FadeInView from '../components/FadeInView';
import SuccessOverlay from '../components/SuccessOverlay';
import { useSystemNotification } from '../context/SystemNotificationContext';
import ExerciseSessionCard from '../components/ExerciseSessionCard';
import { Ionicons } from '@expo/vector-icons';
import SystemActionModal from '../components/SystemActionModal';

const EXERCISE_DATABASE = [
    // --- CHEST ---
    { name: 'Bench Press', category: 'CHEST', mainMuscle: 'chest', subMuscle: 'triceps' },
    { name: 'Incline Bench Press', category: 'CHEST', mainMuscle: 'chest', subMuscle: 'shoulders' },
    { name: 'Decline Bench Press', category: 'CHEST', mainMuscle: 'chest', subMuscle: 'triceps' },
    { name: 'Chest Flies', category: 'CHEST', mainMuscle: 'chest', subMuscle: 'shoulders' },
    { name: 'Pushups', category: 'CHEST', mainMuscle: 'chest', subMuscle: 'triceps', isBodyweight: true },
    { name: 'Chest Press Machine', category: 'CHEST', mainMuscle: 'chest', subMuscle: 'triceps' },
    { name: 'Dips (Chest focus)', category: 'CHEST', mainMuscle: 'chest', subMuscle: 'triceps', isBodyweight: true },
    { name: 'Diamond Pushups', category: 'CHEST', mainMuscle: 'triceps', subMuscle: 'chest', isBodyweight: true },
    
    // --- BACK ---
    { name: 'Deadlift', category: 'BACK', mainMuscle: 'back', subMuscle: 'legs' },
    { name: 'Barbell Row', category: 'BACK', mainMuscle: 'back', subMuscle: 'biceps' },
    { name: 'Seated Row', category: 'BACK', mainMuscle: 'back', subMuscle: 'biceps' },
    { name: 'Lat Pulldown', category: 'BACK', mainMuscle: 'back', subMuscle: 'biceps' },
    { name: 'Pull-ups', category: 'BACK', mainMuscle: 'back', subMuscle: 'biceps', isBodyweight: true },
    { name: 'Bent Over Row', category: 'BACK', mainMuscle: 'back', subMuscle: 'shoulders' },
    { name: 'T-Bar Row', category: 'BACK', mainMuscle: 'back', subMuscle: 'biceps' },
    { name: 'Face Pulls', category: 'BACK', mainMuscle: 'back', subMuscle: 'shoulders' },
    { name: 'Single Arm Row', category: 'BACK', mainMuscle: 'back', subMuscle: 'biceps' },
    { name: 'Hyper Extensions', category: 'BACK', mainMuscle: 'back', subMuscle: 'back', isBodyweight: true },
    
    // --- LEGS ---
    { name: 'Squat', category: 'LEGS', mainMuscle: 'legs', subMuscle: 'back' },
    { name: 'Leg Press', category: 'LEGS', mainMuscle: 'legs', subMuscle: 'legs' },
    { name: 'Lunges', category: 'LEGS', mainMuscle: 'legs', subMuscle: 'glutes', isBodyweight: true },
    { name: 'Leg Extensions', category: 'LEGS', mainMuscle: 'legs', subMuscle: 'legs' },
    { name: 'Leg Curls', category: 'LEGS', mainMuscle: 'legs', subMuscle: 'glutes' },
    { name: 'Calf Raises', category: 'LEGS', mainMuscle: 'legs', subMuscle: 'legs' },
    { name: 'Goblet Squat', category: 'LEGS', mainMuscle: 'legs', subMuscle: 'back' },
    { name: 'Sumo Deadlift', category: 'LEGS', mainMuscle: 'legs', subMuscle: 'back' },
    { name: 'Bulgarian Split Squat', category: 'LEGS', mainMuscle: 'legs', subMuscle: 'glutes' },
    { name: 'Glute Bridges', category: 'LEGS', mainMuscle: 'glutes', subMuscle: 'legs', isBodyweight: true },
    
    // --- SHOULDERS ---
    { name: 'Overhead Press', category: 'SHOULDERS', mainMuscle: 'shoulders', subMuscle: 'triceps' },
    { name: 'Lateral Raises', category: 'SHOULDERS', mainMuscle: 'shoulders', subMuscle: 'shoulders' },
    { name: 'Front Raises', category: 'SHOULDERS', mainMuscle: 'shoulders', subMuscle: 'shoulders' },
    { name: 'Reverse Flies', category: 'SHOULDERS', mainMuscle: 'shoulders', subMuscle: 'back' },
    { name: 'Shrugs', category: 'SHOULDERS', mainMuscle: 'shoulders', subMuscle: 'back' },
    { name: 'Arnold Press', category: 'SHOULDERS', mainMuscle: 'shoulders', subMuscle: 'triceps' },
    { name: 'Military Press', category: 'SHOULDERS', mainMuscle: 'shoulders', subMuscle: 'triceps' },
    
    // --- ARMS ---
    { name: 'Dumbbell Curls', category: 'ARMS', mainMuscle: 'arms', subMuscle: 'arms' },
    { name: 'Tricep Pushdown', category: 'ARMS', mainMuscle: 'arms', subMuscle: 'triceps' },
    { name: 'Dips', category: 'ARMS', mainMuscle: 'triceps', subMuscle: 'chest', isBodyweight: true },
    { name: 'Skull Crushers', category: 'ARMS', mainMuscle: 'arms', subMuscle: 'triceps' },
    { name: 'Hammer Curls', category: 'ARMS', mainMuscle: 'arms', subMuscle: 'arms' },
    { name: 'Preacher Curls', category: 'ARMS', mainMuscle: 'arms', subMuscle: 'arms' },
    { name: 'Concentration Curls', category: 'ARMS', mainMuscle: 'arms', subMuscle: 'arms' },
    { name: 'Overhead Tricep Ext', category: 'ARMS', mainMuscle: 'arms', subMuscle: 'triceps' },
    { name: 'Kickbacks', category: 'ARMS', mainMuscle: 'arms', subMuscle: 'triceps' },
    
    // --- CORE ---
    { name: 'Plank', category: 'CORE', mainMuscle: 'core', subMuscle: 'back', isBodyweight: true, isTimed: true },
    { name: 'Situps', category: 'CORE', mainMuscle: 'core', subMuscle: 'core', isBodyweight: true },
    { name: 'Leg Raises', category: 'CORE', mainMuscle: 'core', subMuscle: 'legs', isBodyweight: true },
    { name: 'Russian Twists', category: 'CORE', mainMuscle: 'core', subMuscle: 'core', isBodyweight: true },
    { name: 'Dead Bug', category: 'CORE', mainMuscle: 'core', subMuscle: 'core', isBodyweight: true },
    { name: 'Hanging Leg Raises', category: 'CORE', mainMuscle: 'core', subMuscle: 'arms', isBodyweight: true },
    { name: 'Side Plank', category: 'CORE', mainMuscle: 'core', subMuscle: 'core', isBodyweight: true, isTimed: true },
];

const SECTIONED_EXERCISES = [
    { title: 'CHEST (DMG: HIGH)', data: EXERCISE_DATABASE.filter(e => e.category === 'CHEST') },
    { title: 'BACK (STR: FOCUS)', data: EXERCISE_DATABASE.filter(e => e.category === 'BACK') },
    { title: 'LEGS (END: MAX)', data: EXERCISE_DATABASE.filter(e => e.category === 'LEGS') },
    { title: 'SHOULDERS (SPD: AGILITY)', data: EXERCISE_DATABASE.filter(e => e.category === 'SHOULDERS') },
    { title: 'ARMS (PWR: UP)', data: EXERCISE_DATABASE.filter(e => e.category === 'ARMS') },
    { title: 'CORE (DEF: TANK)', data: EXERCISE_DATABASE.filter(e => e.category === 'CORE') },
];

const TIMED_EXERCISES = ['Plank', 'Side Plank'];
const BODYWEIGHT_EXERCISES = [
    'Pushups', 'Situps', 'Plank', 'Lunges', 'Pull-ups', 'Dips', 
    'Leg Raises', 'Russian Twists', 'Dead Bug', 'Hanging Leg Raises',
    'Side Plank', 'Hyper Extensions', 'Glute Bridges', 'Chest focus Dips', 'Diamond Pushups'
];

export default function LogScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { showSystemAlert } = useSystemNotification();

    const [profile, setProfile] = useState(null);
    const [workouts, setWorkouts] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [achievements, setAchievements] = useState([]);
    const [activeSession, setActiveSession] = useState(null); // { startTime, exercises: [] }
    const [isLoading, setIsLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [timer, setTimer] = useState(0);
    const [showGuide, setShowGuide] = useState(false);
    const [activeTab, setActiveTab] = useState('RAID'); // RAID or HISTORY
    const [selectedSession, setSelectedSession] = useState(null);
    const [isDungeonClearVisible, setIsDungeonClearVisible] = useState(false);
    const [isLootCollected, setIsLootCollected] = useState(false);
    const [summaryData, setSummaryData] = useState(null);
    

    const [actionModal, setActionModal] = useState({
        visible: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        onConfirm: () => {},
        type: 'SYSTEM'
    });

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    useEffect(() => {
        let interval = null;
        const sessionId = activeSession?.id || activeSession?.startTime;

        if (sessionId) {
            const startTime = new Date(activeSession.startTime).getTime();
            
            const tick = () => {
                setTimer(Math.floor((Date.now() - startTime) / 1000));
            };

            tick();
            interval = setInterval(tick, 1000);
        } else {
            setTimer(0);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeSession?.id, activeSession?.startTime]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const data = await StorageService.loadAllData();
            if (data) {
                setProfile(data.profile);
                setWorkouts(data.workouts);
                setSessions(data.sessions || []);
                setAchievements(data.achievements);
                setActiveSession(data.profile.activeSession || null);
            }
        } catch (e) {
            console.error('Loader error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const persistActiveSession = async (session) => {
        if (!profile) return;
        const updatedProfile = { ...profile, activeSession: session };
        await StorageService.saveUserProfile(updatedProfile);
        setProfile(updatedProfile);
    };

    const handleStartWorkout = () => {
        const newSession = {
            id: Date.now().toString(),
            startTime: new Date().toISOString(),
            exercises: []
        };
        setActiveSession(newSession);
        persistActiveSession(newSession);
        showSystemAlert('Raid Started', 'System monitoring active.', 'SYSTEM');
    };

    const checkIfBodyweight = (exerciseName) => {
        // First check if it's a default bodyweight exercise
        if (BODYWEIGHT_EXERCISES.includes(exerciseName) || exerciseName.toLowerCase().includes('(bw)')) return true;
        
        // Then check if it's a custom exercise with bodyweight type
        const custom = profile?.customExercises?.find(ex => 
            (typeof ex === 'string' ? ex : ex.name) === exerciseName
        );
        return custom?.type === 'bodyweight';
    };

    const handleAddExercise = (exercise) => {
        if (!activeSession) return;
        const name = typeof exercise === 'string' ? exercise : exercise.name;
        
        // Find if this is a timed exercise
        const dbEntry = EXERCISE_DATABASE.find(e => e.name === name);
        const custom = profile?.customExercises?.find(ex => (typeof ex === 'string' ? ex : ex.name) === name);
        const isTimed = dbEntry?.isTimed || custom?.isTimed || name.toLowerCase().includes('plank');

        const newExercise = {
            id: Date.now().toString() + Math.random(),
            name: name,
            isTimed: isTimed,
            mainMuscle: dbEntry?.mainMuscle || 'arms',
            subMuscle: dbEntry?.subMuscle || 'arms',
            sets: [{ 
                id: Date.now().toString() + 1, 
                weight: '', 
                reps: '', 
                duration: '', // For timed exercises
                isCompleted: false 
            }]
        };
        const updatedSession = {
            ...activeSession,
            exercises: [...activeSession.exercises, newExercise]
        };
        setActiveSession(updatedSession);
        persistActiveSession(updatedSession);
        setShowExercisePicker(false);
        setSearchQuery('');
    };

    const getExerciseHistory = (exerciseName) => {
        const dbEntry = EXERCISE_DATABASE.find(e => e.name === exerciseName);
        const isTimed = dbEntry?.isTimed;
        
        const history = workouts
            .filter(w => w.exercise === exerciseName)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        return history.map(w => isTimed ? `${w.reps}s` : `${w.weight} x ${w.reps}`);
    };

    const handleRemoveExercise = (exerciseId) => {
        const updatedExercises = activeSession.exercises.filter(ex => ex.id !== exerciseId);
        const updatedSession = { ...activeSession, exercises: updatedExercises };
        setActiveSession(updatedSession);
        persistActiveSession(updatedSession);
    };

    const handleAddSet = (exerciseId) => {
        const updatedExercises = activeSession.exercises.map(ex => {
            if (ex.id === exerciseId) {
                const lastSet = ex.sets[ex.sets.length - 1];
                return {
                    ...ex,
                    sets: [...ex.sets, { 
                        id: Date.now().toString() + Math.random(), 
                        weight: lastSet?.weight || '', 
                        reps: lastSet?.reps || '', 
                        duration: lastSet?.duration || '', // For timed exercises
                        isCompleted: false 
                    }]
                };
            }
            return ex;
        });
        const updatedSession = { ...activeSession, exercises: updatedExercises };
        setActiveSession(updatedSession);
        persistActiveSession(updatedSession);
    };

    const handleUpdateSet = (exerciseId, setId, field, value) => {
        const updatedExercises = activeSession.exercises.map(ex => {
            if (ex.id === exerciseId) {
                return {
                    ...ex,
                    sets: ex.sets.map(s => (s.id === setId ? { ...s, [field]: value } : s))
                };
            }
            return ex;
        });
        const updatedSession = { ...activeSession, exercises: updatedExercises };
        setActiveSession(updatedSession);
        persistActiveSession(updatedSession);
    };

    const handleToggleSetComplete = (exerciseId, setId) => {
        const updatedExercises = activeSession.exercises.map(ex => {
            if (ex.id === exerciseId) {
                return {
                    ...ex,
                    sets: ex.sets.map(s => {
                        if (s.id === setId) {
                            const newState = !s.isCompleted;
                            if (newState) {
                                showSystemAlert('Set Logged', 'Initiating recovery.', 'SYSTEM');
                            }
                            return { ...s, isCompleted: newState };
                        }
                        return s;
                    })
                };
            }
            return ex;
        });
        const updatedSession = { ...activeSession, exercises: updatedExercises };
        setActiveSession(updatedSession);
        persistActiveSession(updatedSession);
    };

    const handleDeleteSet = (exerciseId, setId) => {
        const updatedExercises = activeSession.exercises.map(ex => {
            if (ex.id === exerciseId) {
                return {
                    ...ex,
                    sets: ex.sets.filter(s => s.id !== setId)
                };
            }
            return ex;
        });
        const updatedSession = { ...activeSession, exercises: updatedExercises };
        setActiveSession(updatedSession);
        persistActiveSession(updatedSession);
    };

    const handleFinishWorkout = async () => {
        if (!activeSession || activeSession.exercises.length === 0) {
            setActionModal({
                visible: true,
                title: 'System Message',
                message: 'No exercises logged in this raid. Abandon current session?',
                confirmText: 'Abandon',
                cancelText: 'Keep Going',
                type: 'DANGER',
                onConfirm: () => {
                    setActiveSession(null);
                    persistActiveSession(null);
                    setActionModal(prev => ({ ...prev, visible: false }));
                }
            });
            return;
        }

        setActionModal({
            visible: true,
            title: 'Finish Raid',
            message: 'Ready to submit your battle data to the system and claim your XP?',
            confirmText: 'Submit ✦',
            cancelText: 'Cancel',
            type: 'SUCCESS',
            onConfirm: () => {
                setActionModal(prev => ({ ...prev, visible: false }));
                processWorkoutCompletion();
            }
        });
    };

    const processWorkoutCompletion = async () => {
        try {
            setIsLoading(true);
            const endTime = new Date().toISOString();
            const session = { ...activeSession, endTime };

            let totalXPGained = 0;
            const newIndividualWorkouts = [];
            
            session.exercises.forEach(ex => {
                const completedSets = ex.sets.filter(s => s.isCompleted);
                if (completedSets.length === 0) return;

                const dbEntry = EXERCISE_DATABASE.find(e => e.name === ex.name);
                const isTimed = ex.isTimed || dbEntry?.isTimed;
                const isBW = checkIfBodyweight(ex.name);
                
                const maxWeight = isBW ? 0 : Math.max(...completedSets.map(s => parseFloat(s.weight) || 0));
                
                // For timed exercises, volume is duration in seconds * a factor (e.g. 1kg/sec)
                const totalVolume = completedSets.reduce((sum, s) => {
                    if (isTimed) {
                        return sum + (parseInt(s.duration) || 0) * 1;
                    }
                    const w = isBW ? 20 : (parseFloat(s.weight) || 0);
                    const r = (parseInt(s.reps) || 0);
                    return sum + (w * r);
                }, 0);
                
                const xp = calculateWorkoutXP(totalVolume, 7, profile.streak, false);
                totalXPGained += xp;

                newIndividualWorkouts.push({
                    id: Date.now().toString() + Math.random(),
                    date: endTime,
                    exercise: ex.name,
                    mainMuscle: dbEntry?.mainMuscle || 'arms', 
                    subMuscle: dbEntry?.subMuscle || 'arms',
                    weight: maxWeight,
                    reps: isTimed 
                        ? Math.max(...completedSets.map(s => parseInt(s.duration) || 0))
                        : Math.max(...completedSets.map(s => parseInt(s.reps) || 0)),
                    sets: completedSets.length,
                    volume: totalVolume,
                    xpGained: xp,
                    isPR: false,
                    isBodyweight: isBW,
                    isTimed: isTimed
                });
            });

            const newTotalXP = profile.totalXP + totalXPGained;
            const levelData = calculateLevelProgress(newTotalXP);
            const oldLevel = profile.level;

            const nextProfile = {
                ...profile,
                totalXP: newTotalXP,
                level: levelData.level,
                lastWorkoutDate: endTime,
                activeSession: null 
            };

            const updatedWorkouts = [...newIndividualWorkouts, ...workouts];
            const newAchievementIds = checkAchievements(nextProfile, updatedWorkouts, achievements);
            const newInventoryItems = InventoryService.checkUnlocks(nextProfile, updatedWorkouts);
            
            if (newAchievementIds.length > 0 || newInventoryItems.length > 0) {
                nextProfile.inventory = [...(nextProfile.inventory || []), ...newInventoryItems];
            }

            await StorageService.saveWorkoutsBulk(newIndividualWorkouts, nextProfile, newAchievementIds);
            await StorageService.saveSession(session);
            
            const muscles = [...new Set(newIndividualWorkouts.flatMap(w => [w.mainMuscle, w.subMuscle]).filter(Boolean))];
            
            setSummaryData({
                xp: totalXPGained,
                volume: newIndividualWorkouts.reduce((s, w) => s + (Number(w.volume) || 0), 0),
                duration: formatTime(timer),
                rank: totalXPGained > 1000 ? 'S' : totalXPGained > 700 ? 'A' : totalXPGained > 400 ? 'B' : 'C',
                newLevel: levelData.level > oldLevel ? levelData.level : null,
                achievements: (newAchievementIds.length + newInventoryItems.length) > 0 
                    ? (newAchievementIds.length + newInventoryItems.length) 
                    : null,
                muscles: muscles
            });
            
            setIsLootCollected(false);
            setIsDungeonClearVisible(true);
            setActiveSession(null);
            loadData();
        } catch (error) {
            console.error('Completion error:', error);
            Alert.alert('System Error', 'Failed to synchronize battle data.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m < 10 && h > 0 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    };

    const filteredExercises = useMemo(() => {
        const all = [...EXERCISE_DATABASE, ...(profile?.customExercises || [])];
        if (!searchQuery) return all.sort((a, b) => (typeof a === 'string' ? a : a.name).localeCompare(typeof b === 'string' ? b : b.name));
        return all.filter(ex => (typeof ex === 'string' ? ex : ex.name).toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => (typeof a === 'string' ? a : a.name).localeCompare(typeof b === 'string' ? b : b.name));
    }, [profile, searchQuery]);

    if (isLoading && !profile) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.primary, letterSpacing: 3, fontSize: 12 }}>INITIALIZING SYSTEM...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { 
                paddingTop: insets.top + 16, 
                backgroundColor: colors.backgroundSecondary, 
                borderBottomColor: colors.border,
                paddingBottom: activeSession ? 10 : 16
            }]}>
                {activeSession ? (
                    <View style={styles.sessionHeaderRow}>
                        <View>
                            <Text style={[styles.title, { color: colors.primary }]}>⟨ ACTIVE RAID ⟩</Text>
                            <Text style={[styles.timer, { color: colors.textPrimary }]}>{formatTime(timer)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <TouchableOpacity onPress={() => setShowGuide(true)}>
                                <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.finishBtn, { backgroundColor: colors.primary }]} onPress={handleFinishWorkout}>
                                <Text style={styles.finishBtnText}>FINISH</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
                        <View style={{ width: 40 }} />
                        <Text style={[styles.title, { color: colors.primary }]}>
                            {showSuccess ? '⟨ RAID HISTORY ⟩' : '⟨ LOG RAID ⟩'}
                        </Text>
                        <TouchableOpacity onPress={() => setShowGuide(true)} style={{ width: 40, alignItems: 'center' }}>
                            <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={[styles.tabBar, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'RAID' && { borderBottomColor: colors.primary }]}
                        onPress={() => setActiveTab('RAID')}
                    >
                        <Ionicons name="flash-outline" size={18} color={activeTab === 'RAID' ? colors.primary : colors.textSecondary} />
                        <Text style={[styles.tabText, { color: activeTab === 'RAID' ? colors.primary : colors.textSecondary }]}>RAID</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'HISTORY' && { borderBottomColor: colors.primary }]}
                        onPress={() => setActiveTab('HISTORY')}
                    >
                        <Ionicons name="time-outline" size={18} color={activeTab === 'HISTORY' ? colors.primary : colors.textSecondary} />
                        <Text style={[styles.tabText, { color: activeTab === 'HISTORY' ? colors.primary : colors.textSecondary }]}>HISTORY</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {activeTab === 'RAID' ? (
                    <>
                        {!activeSession ? (
                            <FadeInView style={styles.emptyContainer}>
                                <View style={[styles.startCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                                    <View style={[styles.accentLine, { backgroundColor: colors.primary }]} />
                                    <Ionicons name="flash-outline" size={40} color={colors.primary} style={{ marginBottom: 16 }} />
                                    <Text style={[styles.startTitle, { color: colors.textPrimary }]}>No active raid detected.</Text>
                                    <Text style={[styles.startSubtitle, { color: colors.textSecondary }]}>Start a session to track your growth and earn XP.</Text>
                                    <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.primary }]} onPress={handleStartWorkout}>
                                        <Text style={styles.startBtnText}>START NEW RAID</Text>
                                    </TouchableOpacity>
                                </View>
                            </FadeInView>
                        ) : (
                            <View style={styles.sessionContainer}>
                                {activeSession.exercises.map((ex) => {
                                    const completedSets = ex.sets.filter(s => s.isCompleted);
                                    let currentXP = 0;
                                    if (completedSets.length > 0) {
                                        const totalVol = completedSets.reduce((sum, s) => {
                                            if (ex.isTimed) return sum + (parseInt(s.duration) || 0) * 1;
                                            const w = checkIfBodyweight(ex.name) ? 20 : (parseFloat(s.weight) || 0);
                                            return sum + w * (parseInt(s.reps) || 0);
                                        }, 0);
                                        currentXP = calculateWorkoutXP(totalVol, 7, profile?.streak || 1, false);
                                    }

                                    return (
                                        <ExerciseSessionCard
                                            key={ex.id}
                                            exercise={ex}
                                            onAddSet={() => handleAddSet(ex.id)}
                                            onDeleteSet={(setId) => handleDeleteSet(ex.id, setId)}
                                            onUpdateSet={(setId, field, val) => handleUpdateSet(ex.id, setId, field, val)}
                                            onToggleSetComplete={(setId) => handleToggleSetComplete(ex.id, setId)}
                                            onRemoveExercise={() => handleRemoveExercise(ex.id)}
                                            historyData={getExerciseHistory(ex.name)}
                                            isBodyweight={checkIfBodyweight(ex.name)}
                                            isTimed={ex.isTimed}
                                            mainMuscle={ex.mainMuscle || 'arms'}
                                            subMuscle={ex.subMuscle || 'arms'}
                                            xp={currentXP}
                                        />
                                    );
                                })}
                                <TouchableOpacity style={[styles.addExerciseBtn, { borderColor: colors.primary }]} onPress={() => setShowExercisePicker(true)}>
                                    <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                                    <Text style={[styles.addExerciseText, { color: colors.primary }]}>ADD EXERCISE</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                                    setActionModal({
                                        visible: true,
                                        title: 'Abandon Raid',
                                        message: 'All current battle data will be lost. Are you sure you want to retreat?',
                                        confirmText: 'Abandon',
                                        cancelText: 'Cancel',
                                        type: 'DANGER',
                                        onConfirm: () => {
                                            setActiveSession(null);
                                            persistActiveSession(null);
                                            setActionModal(prev => ({ ...prev, visible: false }));
                                        }
                                    });
                                }}>
                                    <Text style={[styles.cancelBtnText, { color: '#ff4444' }]}>ABANDON RAID</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                ) : (
                    <FadeInView style={styles.historyContainer}>
                        {sessions.length === 0 ? (
                            <View style={styles.emptyHistory}>
                                <Ionicons name="documents-outline" size={40} color={colors.textSecondary} />
                                <Text style={[styles.emptyHistoryText, { color: colors.textSecondary }]}>No raid logs found in memory.</Text>
                            </View>
                        ) : (
                            sessions.map((session, idx) => (
                                <TouchableOpacity
                                    key={session.id || idx}
                                    style={[styles.historyItem, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                                    onPress={() => setSelectedSession(session)}
                                >
                                    <View style={styles.historyItemHeader}>
                                        <Text style={[styles.historyDate, { color: colors.textPrimary }]}>
                                            {new Date(session.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </Text>
                                        <View style={[styles.historyTag, { backgroundColor: colors.primary }]}>
                                            <Text style={styles.historyTagText}>RAID CLEARED</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.historyExerciseList, { color: colors.textSecondary }]}>
                                        {session.exercises.map(ex => ex.name).join(', ')}
                                    </Text>
                                    <View style={styles.historyStats}>
                                        <View style={styles.historyStat}>
                                            <Ionicons name="time-outline" size={14} color={colors.primary} />
                                            <Text style={[styles.historyStatText, { color: colors.textPrimary }]}>
                                                {formatTime(Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000))}
                                            </Text>
                                        </View>
                                        <View style={styles.historyStat}>
                                            <Ionicons name="fitness-outline" size={14} color={colors.primary} />
                                            <Text style={[styles.historyStatText, { color: colors.textPrimary }]}>
                                                {session.exercises.length} EXERCISES
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </FadeInView>
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Session Detail Modal for Web */}
            <Modal visible={!!selectedSession} animationType="fade" transparent>
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background, borderTopWidth: 2, borderColor: colors.primary, width: '90%', maxWidth: 600, alignSelf: 'center', marginVertical: 40, height: 'auto', maxHeight: '85%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.primary }]}>⟨ RAID RECORD ⟩</Text>
                            <TouchableOpacity onPress={() => setSelectedSession(null)}>
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {selectedSession && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.detailCard}>
                                    <Text style={[styles.detailDate, { color: colors.textPrimary }]}>
                                        {new Date(selectedSession.startTime).toLocaleString()}
                                    </Text>
                                    <Text style={[styles.detailDuration, { color: colors.textSecondary }]}>
                                        Duration: {formatTime(Math.floor((new Date(selectedSession.endTime).getTime() - new Date(selectedSession.startTime).getTime()) / 1000))}
                                    </Text>
                                </View>

                                {selectedSession.exercises.map((ex, exIdx) => (
                                    <View key={exIdx} style={[styles.detailExCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                                        <Text style={[styles.detailExName, { color: colors.primary }]}>{ex.name}</Text>
                                        {ex.sets.filter(s => s.isCompleted).map((set, sIdx) => (
                                            <View key={sIdx} style={styles.detailSetRow}>
                                                <Text style={[styles.detailSetNum, { color: colors.textSecondary }]}>Set {sIdx + 1}</Text>
                                                <Text style={[styles.detailSetVal, { color: colors.textPrimary }]}>
                                                    {ex.isTimed ? `${set.duration}s` : `${set.weight}kg x ${set.reps}`}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                ))}
                                <TouchableOpacity
                                    style={[styles.startBtn, { backgroundColor: colors.primary, marginTop: 20 }]}
                                    onPress={() => setSelectedSession(null)}
                                >
                                    <Text style={styles.startBtnText}>CLOSE RECORD</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            <Modal visible={showExercisePicker} animationType="slide" transparent>
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background, borderTopColor: colors.primary }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.primary }]}>⟨ SELECT EXERCISE ⟩</Text>
                            <TouchableOpacity onPress={() => setShowExercisePicker(false)}><Ionicons name="close" size={24} color={colors.textPrimary} /></TouchableOpacity>
                        </View>
                        <TextInput style={[styles.searchInput, { backgroundColor: colors.backgroundSecondary, color: colors.textPrimary, borderColor: colors.border }]} placeholder="Search..." placeholderTextColor={colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
                        {searchQuery ? (
                            <FlatList
                                data={EXERCISE_DATABASE.concat(profile?.customExercises || []).filter(e => 
                                    (typeof e === 'string' ? e : e.name).toLowerCase().includes(searchQuery.toLowerCase())
                                )}
                                keyExtractor={(item, index) => (typeof item === 'string' ? item : item.name) + index}
                                renderItem={({ item }) => (
                                    <TouchableOpacity 
                                        style={[styles.exerciseItem, { borderBottomColor: colors.border }]}
                                        onPress={() => handleAddExercise(item)}
                                    >
                                        <Text style={[styles.exerciseName, { color: colors.textPrimary }]}>
                                            {typeof item === 'string' ? item : item.name}
                                        </Text>
                                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            />
                        ) : (
                            <FlatList
                                data={[
                                    ...(profile?.customExercises?.length > 0 ? [{ title: 'CUSTOM (USER: GEN)', data: profile.customExercises }] : []),
                                    ...SECTIONED_EXERCISES
                                ]}
                                keyExtractor={(item, index) => item.title + index}
                                renderItem={({ item }) => (
                                    <View>
                                        <View style={[styles.sectionHeader, { backgroundColor: colors.backgroundSecondary }]}>
                                            <Text style={[styles.sectionHeaderText, { color: colors.primary }]}>{item.title}</Text>
                                        </View>
                                        {item.data.map((ex, idx) => (
                                            <TouchableOpacity 
                                                key={idx}
                                                style={[styles.exerciseItem, { borderBottomColor: colors.border }]}
                                                onPress={() => handleAddExercise(ex)}
                                            >
                                                <Text style={[styles.exerciseName, { color: colors.textPrimary }]}>
                                                    {typeof ex === 'string' ? ex : ex.name}
                                                </Text>
                                                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
            <SuccessOverlay visible={showSuccess} onAnimationEnd={() => setShowSuccess(false)} />
            
            <SystemActionModal 
                visible={actionModal.visible}
                title={actionModal.title}
                message={actionModal.message}
                confirmText={actionModal.confirmText}
                cancelText={actionModal.cancelText}
                onConfirm={actionModal.onConfirm}
                onCancel={() => setActionModal(prev => ({ ...prev, visible: false }))}
                type={actionModal.type}
            />

            {/* Dungeon Clear Modal */}
            <Modal
                visible={isDungeonClearVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsDungeonClearVisible(false)}
            >
                <View style={styles.clearOverlay}>
                    <FadeInView duration={600} style={[styles.clearContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary }]}>
                        <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
                        
                        <Ionicons 
                            name={isLootCollected ? "shield-checkmark" : "cube-outline"} 
                            size={60} 
                            color={colors.primary} 
                            style={{ alignSelf: 'center', marginBottom: 10 }} 
                        />
                        <Text style={{ 
                                    color: colors.primary, 
                                    fontSize: 22, 
                                    fontWeight: 'bold', 
                                    marginBottom: 20, 
                                    letterSpacing: 4,
                                    textAlign: 'center'
                                }}>
                                    {isLootCollected ? '⟨ RAID CLEARED ⟩' : '⟨ REWARD PENDING ⟩'}
                                </Text>
                        
                        {!isLootCollected ? (
                            <View style={{ alignItems: 'center', marginVertical: 40 }}>
                                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>The system has dropped a reward crate. Extract loot to claim your rewards.</Text>
                                <TouchableOpacity 
                                    style={[styles.collectBtn, { backgroundColor: colors.accent || colors.primary, minWidth: 200 }]} 
                                    onPress={() => setIsLootCollected(true)}
                                >
                                    <Text style={styles.collectBtnText}>EXTRACT LOOT ✦</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <View style={[styles.raidRankBadge, { borderColor: colors.success }]}>
                                    <Text style={[styles.raidRankText, { color: colors.success }]}>RAID RANK: {summaryData?.rank}</Text>
                                </View>
 
                                <View style={styles.clearStatsGrid}>
                                    <View style={styles.clearStatItem}>
                                        <Text style={[styles.clearStatLabel, { color: colors.textSecondary }]}>ENERGY (XP) EXTRACTED</Text>
                                        <Text style={[styles.clearStatValue, { color: colors.primary }]}>+{summaryData?.xp} XP</Text>
                                    </View>
                                    <View style={styles.clearStatItem}>
                                        <Text style={[styles.clearStatLabel, { color: colors.textSecondary }]}>VOLUME CLEARED</Text>
                                        <Text style={[styles.clearStatValue, { color: colors.textPrimary }]}>{Math.floor(summaryData?.volume || 0)} KG</Text>
                                    </View>
                                    <View style={styles.clearStatItem}>
                                        <Text style={[styles.clearStatLabel, { color: colors.textSecondary }]}>RAID TIME</Text>
                                        <Text style={[styles.clearStatValue, { color: colors.textPrimary }]}>{summaryData?.duration}</Text>
                                    </View>
                                </View>

                                {summaryData?.muscles && summaryData.muscles.length > 0 && (
                                    <View style={styles.summaryMusclesRow}>
                                        <Text style={[styles.summaryMusclesLabel, { color: colors.textSecondary }]}>SYSTEM TARGETS:</Text>
                                        <View style={styles.summaryMusclesTags}>
                                            {summaryData.muscles.map(m => (
                                                <View key={m} style={[styles.summaryMuscleTag, { borderColor: colors.primary }]}>
                                                    <Text style={[styles.summaryMuscleTagText, { color: colors.primary }]}>{m.toUpperCase()}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                                      {summaryData?.newLevel && (
                                    <View style={[styles.lootItem, { borderColor: colors.warning, backgroundColor: 'rgba(255,215,0,0.05)', borderStyle: 'dashed' }]}>
                                        <Ionicons name="trending-up" size={18} color={colors.warning} />
                                        <View>
                                            <Text style={[styles.lootText, { color: colors.warning, fontSize: 13 }]}>SYSTEM UPDATE</Text>
                                            <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: 'bold' }}>REACHED LEVEL {summaryData.newLevel}</Text>
                                        </View>
                                    </View>
                                )}

                                {summaryData?.achievements && (
                                    <View style={[styles.lootItem, { borderColor: colors.accent, backgroundColor: 'rgba(0,212,255,0.05)', borderStyle: 'dotted' }]}>
                                        <Ionicons name="cube" size={18} color={colors.accent || colors.primary} />
                                        <View>
                                            <Text style={[styles.lootText, { color: colors.accent || colors.primary, fontSize: 13 }]}>LOOT DROPPED</Text>
                                            <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: 'bold' }}>{summaryData.achievements} NEW ITEMS RECOVERED</Text>
                                        </View>
                                    </View>
                                )}
 
                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                                    <TouchableOpacity 
                                        style={[styles.collectBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 6, opacity: 0.9 }]} 
                                        onPress={() => Share.share({ 
                                            message: `RANK: ${summaryData?.rank} RAID CLEARED! ⚔️\nGain: +${summaryData?.xp} XP\nVolume: ${Math.floor(summaryData?.volume || 0)} KG\nJoin Hunter Gate and begin your awakening!` 
                                        })}
                                    >
                                        <Ionicons name="share-social-outline" size={16} color={colors.primary} />
                                        <Text style={[styles.collectBtnText, { color: colors.primary, fontSize: 10 }]}>SHARE REPORT</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.collectBtn, { backgroundColor: colors.primary, flex: 1.5 }]} 
                                        onPress={() => setIsDungeonClearVisible(false)}
                                    >
                                        <Text style={styles.collectBtnText}>CLOSE FILE</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </FadeInView>
                </View>
            </Modal>

            {/* Raid Guide Modal */}
            <Modal visible={showGuide} transparent animationType="fade" onRequestClose={() => setShowGuide(false)}>
                <View style={styles.guideOverlay}>
                    <FadeInView style={[styles.guideContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary }]}>
                        <View style={[styles.guideHeader, { borderBottomColor: colors.border }]}>
                            <Ionicons name="documents-outline" size={24} color={colors.primary} />
                            <Text style={[styles.guideTitle, { color: colors.textPrimary }]}>RAID MANUAL</Text>
                            <TouchableOpacity onPress={() => setShowGuide(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ marginBottom: 20 }}>
                            <RaidGuideSection title="INITIALIZING A RAID (EXERCISE)" icon="play" color={colors.primary}>
                                Select exercises (Bench, Squat, etc.) from the system database to begin your gym workout. Use the search bar to find specific equipment.
                            </RaidGuideSection>
                            <RaidGuideSection title="COMBAT SETS (WORKOUT LOG)" icon="flash" color={colors.warning}>
                                Enter weight (KG) and reps for each set. This represents your practical output in the gym. The system translates physical effort into Growth XP.
                            </RaidGuideSection>
                            <RaidGuideSection title="DUNGEON CLEAR (SAVES SESSION)" icon="shield-checkmark" color={colors.success}>
                                Tap "FINISH RAID" once your gym session is over. You must then manually "EXTRACT LOOT" to save your workout data permanently.
                            </RaidGuideSection>
                            <RaidGuideSection title="RAID RANKS" icon="medal" color={colors.accent || colors.primary}>
                                Your performance is ranked S-E (Elite to Novice) based on intensity and effort.
                            </RaidGuideSection>
                        </ScrollView>
                        <TouchableOpacity 
                            style={[styles.collectBtn, { backgroundColor: colors.primary }]} 
                            onPress={() => setShowGuide(false)}
                        >
                            <Text style={styles.collectBtnText}>I UNDERSTAND</Text>
                        </TouchableOpacity>
                    </FadeInView>
                </View>
            </Modal>
        </View>
    );
}

const RaidGuideSection = ({ title, icon, color, children }) => {
    const { colors } = useTheme();
    return (
        <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 }}>
                <Ionicons name={icon} size={16} color={color} />
                <Text style={{ fontSize: 12, fontWeight: 'bold', letterSpacing: 1, color }}>{title}</Text>
            </View>
            <Text style={{ fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>{children}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { alignItems: 'center', borderBottomWidth: 1 },
    sessionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 20 },
    title: { fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
    timer: { fontSize: 14, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 2 },
    finishBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
    finishBtnText: { color: '#000', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
    content: { flex: 1, padding: SIZES.padding },
    emptyContainer: { flex: 1, justifyContent: 'center', paddingTop: 60 },
    startCard: { padding: 30, borderRadius: 20, borderWidth: 1, alignItems: 'center', position: 'relative', overflow: 'hidden' },
    accentLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
    startTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 },
    startSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    startBtn: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
    startBtnText: { color: '#000', fontWeight: 'bold', letterSpacing: 2 },
    sessionContainer: { flex: 1 },
    addExerciseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, gap: 10, marginBottom: 20 },
    addExerciseText: { fontWeight: 'bold', letterSpacing: 1, fontSize: 13 },
    cancelBtn: { paddingVertical: 16, alignItems: 'center' },
    cancelBtnText: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
    
    // Tab Bar Styles
    tabBar: { flexDirection: 'row', height: 48, borderBottomWidth: 1, width: '100%' },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabText: { fontSize: 13, fontWeight: 'bold', letterSpacing: 1.5 },

    // History Styles
    historyContainer: { paddingTop: 10 },
    historyItem: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, cursor: 'pointer' },
    historyItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    historyDate: { fontSize: 14, fontWeight: 'bold' },
    historyTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    historyTagText: { color: '#000', fontSize: 9, fontWeight: 'bold' },
    historyExerciseList: { fontSize: 12, marginBottom: 12 },
    historyStats: { flexDirection: 'row', gap: 16 },
    historyStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    historyStatText: { fontSize: 11, fontWeight: 'bold' },
    emptyHistory: { alignItems: 'center', paddingVertical: 60, gap: 16 },
    emptyHistoryText: { fontSize: 13, fontStyle: 'italic' },

    // Detail Modal Styles
    detailCard: { marginBottom: 20 },
    detailDate: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    detailDuration: { fontSize: 12 },
    detailExCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
    detailExName: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 },
    detailSetRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    detailSetNum: { fontSize: 12 },
    detailSetVal: { fontSize: 12, fontWeight: 'bold' },

    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modalContent: { height: '85%', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderTopWidth: 2, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
    searchInput: { height: 45, borderRadius: 10, borderWidth: 1, paddingHorizontal: 16, marginBottom: 20, fontSize: 14 },
    sectionHeader: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginTop: 10,
    },
    sectionHeaderText: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    exerciseItem: { paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1 },
    exerciseName: { fontSize: 15, fontWeight: '500' },
    guideOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    guideContent: { width: '100%', maxWidth: 400, borderRadius: 24, borderWidth: 1, padding: 30, maxHeight: '80%' },
    guideHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottomWidth: 1, marginBottom: 16 },
    guideTitle: { fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
    collectBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    collectBtnText: { color: '#000', fontWeight: 'bold', letterSpacing: 2, fontSize: 14 },
    // Dungeon Clear Styles
    clearOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    clearContent: {
        width: '100%',
        maxWidth: 450,
        backgroundColor: '#111',
        borderRadius: 24,
        borderWidth: 1,
        padding: 24,
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
    clearTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        letterSpacing: 4,
        marginBottom: 20,
    },
    raidRankBadge: {
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        marginBottom: 24,
    },
    raidRankText: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    clearStatsGrid: {
        gap: 12,
        marginBottom: 24,
    },
    clearStatItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    clearStatLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    clearStatValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    lootItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 10,
        gap: 12,
    },
    lootText: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    summaryMusclesRow: { 
        marginTop: 20, 
        paddingHorizontal: 10,
        width: '100%',
    },
    summaryMusclesLabel: { 
        fontSize: 10, 
        fontWeight: 'bold', 
        letterSpacing: 2, 
        marginBottom: 10,
        textAlign: 'center'
    },
    summaryMusclesTags: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: 8,
        justifyContent: 'center'
    },
    summaryMuscleTag: { 
        paddingHorizontal: 10, 
        paddingVertical: 5, 
        borderRadius: 8, 
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.05)'
    },
    summaryMuscleTagText: { 
        fontSize: 9, 
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },
});
