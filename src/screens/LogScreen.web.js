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
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import FadeInView from '../components/FadeInView';
import SuccessOverlay from '../components/SuccessOverlay';
import { useSystemNotification } from '../context/SystemNotificationContext';
import ExerciseSessionCard from '../components/ExerciseSessionCard';
import { Ionicons } from '@expo/vector-icons';
import SystemActionModal from '../components/SystemActionModal';

const DEFAULT_EXERCISES = [
    'Bench Press', 'Squat', 'Deadlift', 'Barbell Row', 'Pull-ups',
    'Dumbbell Curls', 'Leg Press', 'Chest Flies', 'Overhead Press',
    'Lat Pulldown', 'Tricep Pushdown', 'Dips', 'Lunges', 'Pushups', 'Situps', 'Plank'
];

const BODYWEIGHT_EXERCISES = ['Pushups', 'Situps', 'Plank', 'Lunges', 'Pull-ups', 'Dips'];

export default function LogScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { showSystemAlert } = useSystemNotification();

    const [profile, setProfile] = useState(null);
    const [workouts, setWorkouts] = useState([]);
    const [achievements, setAchievements] = useState([]);
    const [activeSession, setActiveSession] = useState(null); // { startTime, exercises: [] }
    const [isLoading, setIsLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [timer, setTimer] = useState(0);
    const [showGuide, setShowGuide] = useState(false);
    const [isDungeonClearVisible, setIsDungeonClearVisible] = useState(false);
    const [isLootCollected, setIsLootCollected] = useState(false);
    const [summaryData, setSummaryData] = useState(null);
    const timerRef = useRef(null);

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
        if (activeSession && !timerRef.current) {
            const start = new Date(activeSession.startTime).getTime();
            timerRef.current = setInterval(() => {
                setTimer(Math.floor((Date.now() - start) / 1000));
            }, 1000);
        } else if (!activeSession && timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            setTimer(0);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [activeSession]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const data = await StorageService.loadAllData();
            if (data) {
                setProfile(data.profile);
                setWorkouts(data.workouts);
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

    const handleAddExercise = (exerciseName) => {
        if (!activeSession) return;
        const newExercise = {
            id: Date.now().toString() + Math.random(),
            name: exerciseName,
            sets: [{ id: Date.now().toString() + 1, weight: '', reps: '', isCompleted: false }]
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
        const history = workouts
            .filter(w => w.exercise === exerciseName)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        return history.map(w => `${w.weight} x ${w.reps}`);
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

                const isBW = checkIfBodyweight(ex.name);
                const maxWeight = isBW ? 0 : Math.max(...completedSets.map(s => parseFloat(s.weight) || 0));
                
                // For BW exercises, we use a virtual weight of 20kg per rep for volume calculation
                const totalVolume = completedSets.reduce((sum, s) => {
                    const w = isBW ? 20 : (parseFloat(s.weight) || 0);
                    return sum + w * (parseInt(s.reps) || 0);
                }, 0);
                
                const xp = calculateWorkoutXP(totalVolume, 7, profile.streak, false);
                totalXPGained += xp;

                newIndividualWorkouts.push({
                    id: Date.now().toString() + Math.random(),
                    date: endTime,
                    exercise: ex.name,
                    weight: maxWeight,
                    reps: Math.max(...completedSets.map(s => parseInt(s.reps) || 0)),
                    sets: completedSets.length,
                    volume: totalVolume,
                    xpGained: xp,
                    isPR: false,
                    isBodyweight: isBW
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
            const toUnlock = checkAchievements(nextProfile, updatedWorkouts, achievements);

            await StorageService.saveWorkoutsBulk(newIndividualWorkouts, nextProfile, toUnlock);
            await StorageService.saveSession(session);
            
            setSummaryData({
                xp: totalXPGained,
                volume: newIndividualWorkouts.reduce((s, w) => s + w.volume, 0),
                duration: formatTime(timer),
                rank: totalXPGained > 1000 ? 'S' : totalXPGained > 700 ? 'A' : totalXPGained > 400 ? 'B' : 'C',
                newLevel: levelData.level > oldLevel ? levelData.level : null,
                achievements: toUnlock.length > 0 ? toUnlock.length : null
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
        const all = [...DEFAULT_EXERCISES, ...(profile?.customExercises || [])];
        if (!searchQuery) return all.sort();
        return all.filter(ex => ex.toLowerCase().includes(searchQuery.toLowerCase())).sort();
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
            </View>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
                        {activeSession.exercises.map((ex) => (
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
                            />
                        ))}
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
                <View style={{ height: 100 }} />
            </ScrollView>

            <Modal visible={showExercisePicker} animationType="slide" transparent>
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background, borderTopColor: colors.primary }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.primary }]}>⟨ SELECT EXERCISE ⟩</Text>
                            <TouchableOpacity onPress={() => setShowExercisePicker(false)}><Ionicons name="close" size={24} color={colors.textPrimary} /></TouchableOpacity>
                        </View>
                        <TextInput style={[styles.searchInput, { backgroundColor: colors.backgroundSecondary, color: colors.textPrimary, borderColor: colors.border }]} placeholder="Search..." placeholderTextColor={colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
                        <FlatList
                            data={filteredExercises}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={[styles.exerciseItem, { borderBottomColor: colors.border }]} onPress={() => handleAddExercise(item)}>
                                    <Text style={[styles.exerciseName, { color: colors.textPrimary }]}>{item}</Text>
                                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        />
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
                        <Text style={[styles.clearTitle, { color: colors.primary }]}>
                            {isLootCollected ? '⟨ DUNGEON CLEARED ⟩' : '⟨ REWARD PENDING ⟩'}
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
 
                                {summaryData?.newLevel && (
                                    <View style={[styles.lootItem, { borderColor: colors.warning, backgroundColor: 'rgba(255,215,0,0.1)' }]}>
                                        <Ionicons name="trending-up" size={20} color={colors.warning} />
                                        <Text style={[styles.lootText, { color: colors.warning }]}>SYSTEM UPDATE: REACHED LEVEL {summaryData.newLevel}</Text>
                                    </View>
                                )}
 
                                {summaryData?.achievements && (
                                    <View style={[styles.lootItem, { borderColor: colors.accent || colors.primary, backgroundColor: 'rgba(0,212,255,0.1)' }]}>
                                        <Ionicons name="trophy" size={20} color={colors.accent || colors.primary} />
                                        <Text style={[styles.lootText, { color: colors.accent || colors.primary }]}>NEW LOOT UNLOCKED: {summaryData.achievements} ITEMS</Text>
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
    header: { paddingBottom: 14, alignItems: 'center', borderBottomWidth: 1 },
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
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalContent: { height: '85%', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderTopWidth: 2, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
    searchInput: { height: 45, borderRadius: 10, borderWidth: 1, paddingHorizontal: 16, marginBottom: 20, fontSize: 14 },
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
});
