import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share, Switch, Platform, Animated, Dimensions, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { StorageService } from '../services/StorageService';
import { InventoryService, INVENTORY_ITEMS } from '../services/InventoryService';
import { getRank, calculateLevelProgress } from '../utils/gameLogic';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { totalHoursTrained, weekOverWeekSummary, bestLiftWithDate } from '../utils/workoutAnalytics';
import FadeInView from '../components/FadeInView';

export default function ProfileScreen() {
    const { colors, isDark, setDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const [profile, setProfile] = useState(null);
    const [workouts, setWorkouts] = useState([]);
    const [customExerciseName, setCustomExerciseName] = useState('');
    const [isSyncModalVisible, setIsSyncModalVisible] = useState(false);
    const [isInventoryModalVisible, setIsInventoryModalVisible] = useState(false);
    const [syncUid, setSyncUid] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    const auraAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (profile?.equipped?.aura) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(auraAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(auraAnim, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            auraAnim.setValue(0);
        }
    }, [profile?.equipped?.aura]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        const data = await StorageService.loadAllData();
        if (data) {
            setProfile(data.profile);
            setWorkouts(data.workouts);
        }
    };

    const handleEquip = async (item) => {
        if (!profile) return;
        
        const newEquipped = { ...(profile.equipped || {}) };
        if (newEquipped[item.type] === item.id) {
            // Unequip if already equipped
            newEquipped[item.type] = null;
        } else {
            newEquipped[item.type] = item.id;
        }

        const nextProfile = { ...profile, equipped: newEquipped };
        await StorageService.saveUserProfile(nextProfile);
        setProfile(nextProfile);
    };

    const levelInfo = useMemo(() => {
        if (!profile) return null;
        return calculateLevelProgress(profile.totalXP);
    }, [profile]);

    const avgIntensity = useMemo(() => {
        if (!workouts.length) return 0;
        const s = workouts.reduce((a, w) => a + (Number(w.intensity) || 0), 0);
        return s / workouts.length;
    }, [workouts]);

    const wow = useMemo(() => weekOverWeekSummary(workouts), [workouts]);

    const bench = useMemo(() => bestLiftWithDate(workouts, 'Bench Press'), [workouts]);
    const squat = useMemo(() => bestLiftWithDate(workouts, 'Squat'), [workouts]);
    const deadlift = useMemo(() => bestLiftWithDate(workouts, 'Deadlift'), [workouts]);

    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [tempName, setTempName] = useState('');

    const handleEditName = () => {
        if (Platform.OS === 'ios' && Alert.prompt) {
            Alert.prompt(
                'SYSTEM IDENTITY',
                'Enter your hunter name to register in the system.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'REGISTER',
                        onPress: async (name) => {
                            if (name && name.trim()) {
                                const next = { ...profile, name: name.trim() };
                                await StorageService.saveUserProfile(next);
                                setProfile(next);
                                Alert.alert('SYSTEM UPDATED', `Welcome, Hunter ${name.trim()}.`);
                            }
                        },
                    },
                ],
                'plain-text',
                profile?.name || ''
            );
        } else {
            // Android Support via Custom Modal
            setTempName(profile?.name || '');
            setIsEditModalVisible(true);
        }
    };

    const saveName = async () => {
        if (tempName && tempName.trim()) {
            const next = { ...profile, name: tempName.trim() };
            await StorageService.saveUserProfile(next);
            setProfile(next);
            setIsEditModalVisible(false);
            Alert.alert('SYSTEM UPDATED', `Welcome, Hunter ${tempName.trim()}.`);
        } else {
            Alert.alert('System Error', 'Hunter name cannot be empty.');
        }
    };

    const handleExport = async () => {
        try {
            const data = await StorageService.exportData();
            await Share.share({ message: data, title: 'Hunter Stats Backup' });
        } catch {
            Alert.alert('ERROR', 'E-Rank performance: Export failed.');
        }
    };

    const handleSyncConnect = async () => {
        if (!syncUid || syncUid.trim().length === 0) {
            Alert.alert('Error', 'Please enter a valid Hunter ID.');
            return;
        }

        setIsSyncing(true);
        try {
            const result = await StorageService.importCloudData(syncUid.trim());
            if (result) {
                setProfile(result.profile);
                setWorkouts(result.workouts);
                setIsSyncModalVisible(false);
                setSyncUid('');
                Alert.alert('SYNC SUCCESS', 'Equipment and stats have been synchronized from the cloud.');
            } else {
                Alert.alert('Sync Failed', 'Could not find data for this Hunter ID.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Sync Error', 'An error occurred during synchronization.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleManualSync = async () => {
        if (!profile?.uid) return;
        setIsSyncing(true);
        try {
            await StorageService.saveUserProfile(profile);
            Alert.alert('SYNC COMPLETE', 'Your local battle data has been sent to the cloud.');
        } catch {
            Alert.alert('Sync Error', 'Failed to reach the cloud server.');
        } finally {
            setIsSyncing(false);
        }
    };

    const copyUid = async () => {
        if (!profile?.uid) return;
        await Clipboard.setStringAsync(profile.uid);
        Alert.alert('SYSTEM SYNC', 'Hunter ID copied to clipboard. Keep this safe for account recovery.');
    };

    const handleShareUid = () => {
        if (!profile?.uid) return;
        Share.share({
            message: `My Hunter Gate ID: ${profile.uid}\n\nKeep this ID safe! You can use it to recover your workouts and progress if you delete the app or change phones.`,
            title: 'Hunter Gate Recovery Key'
        });
    };
    const handleAddCustomExercise = async () => {
        const name = customExerciseName.trim();
        if (!name) return;
        
        const currentCustoms = profile.customExercises || [];
        if (currentCustoms.includes(name)) {
            Alert.alert('System Error', 'Exercise already exists in the system.');
            return;
        }

        const nextProfile = {
            ...profile,
            customExercises: [...currentCustoms, name],
        };

        await StorageService.saveUserProfile(nextProfile);
        setProfile(nextProfile);
        setCustomExerciseName('');
        Alert.alert('Exercise Registered', `"${name}" added to the Hunter log.`);
    };

    const handleClearData = () => {
        Alert.alert('SYSTEM RESET', 'This wipes workouts, XP, achievements, and settings on this device.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'RESET',
                style: 'destructive',
                onPress: async () => {
                    await StorageService.clearAllData();
                    await setDarkMode(true);
                    Alert.alert('Reset complete', 'The system has been cleared.');
                    loadData();
                },
            },
        ]);
    };

    if (!profile || !levelInfo) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.primary }}>INITIALIZING HUNTER SYSTEM...</Text>
            </View>
        );
    }

    const getAuraColor = (auraId) => {
        switch (auraId) {
            case 'aura_purple': return '#bf00ff';
            case 'aura_blue': return colors.accent || colors.primary;
            case 'aura_red': return '#ff3333';
            case 'aura_black': return '#111111';
            default: return null;
        }
    };

    const getBorderColor = (borderId) => {
        switch (borderId) {
            case 'border_gold': return '#FFD700';
            case 'border_neon': return '#00f2ff';
            default: return colors.primary;
        }
    };

    const rank = getRank(levelInfo.level);
    const borderColor = getBorderColor(profile.equipped?.border);
    const auraColor = getAuraColor(profile.equipped?.aura);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FadeInView duration={400} style={{ flex: 1 }}>
                <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.primary }]}>⟨ HUNTER PROFILE ⟩</Text>
                </View>

            <ScrollView style={styles.content}>
                <View style={{ position: 'relative', marginBottom: 20 }}>
                    {auraColor && (
                        <Animated.View 
                            style={[
                                styles.auraContainer, 
                                { 
                                    borderColor: auraColor,
                                    shadowColor: auraColor,
                                    shadowRadius: 15,
                                    shadowOpacity: 0.8,
                                    opacity: auraAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.2, 0.7]
                                    }),
                                    transform: [{
                                        scale: auraAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [1, 1.05]
                                        })
                                    }]
                                }
                            ]} 
                        />
                    )}

                    <FadeInView delay={100} style={[
                        styles.profileCard, 
                        { 
                            backgroundColor: colors.backgroundSecondary, 
                            borderColor: borderColor,
                            borderWidth: profile.equipped?.border ? 2 : 1,
                            marginBottom: 0
                        }
                    ]}>
                        <View style={[styles.glowLineTop, { backgroundColor: borderColor }]} />
                        <TouchableOpacity onPress={handleEditName} style={styles.avatarWrap}>
                            <View style={[styles.avatarPlaceholder, { 
                                borderColor: borderColor, 
                                backgroundColor: colors.transparentPrimary 
                            }]}>
                                <Text style={[styles.avatarText, { color: borderColor }]}>
                                    {(profile.name || 'H').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={[styles.editIcon, { backgroundColor: borderColor }]}>
                                <Text style={{ color: colors.background, fontSize: 10, fontWeight: 'bold' }}>EDIT</Text>
                            </View>
                        </TouchableOpacity>
                        <Text style={[styles.nameText, { color: colors.textPrimary }]}>
                            {profile.name} {profile.equipped?.title ? `⟨ ${InventoryService.getItem(profile.equipped.title)?.name} ⟩` : ''}
                        </Text>
                        <View style={[styles.rankBadge, { borderColor: colors.success, backgroundColor: colors.transparentSuccess }]}>
                            <Text style={[styles.rankText, { color: colors.success }]}>{rank}</Text>
                        </View>
                        <Text style={[styles.shadowArmyText, { color: colors.primaryGlow || colors.accent || colors.primary }]}>
                            SHADOWS EXTRACTED: {Math.max(0, Math.floor((workouts.length / 5) + (levelInfo.level)))}
                        </Text>
                        <Text style={[styles.joinDate, { color: colors.textSecondary }]}>
                            Hunter since {new Date(profile.createdDate).toLocaleDateString()}
                        </Text>
                    </FadeInView>
                </View>

                <FadeInView delay={200} style={[styles.infoSection, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <Text style={[styles.infoTitle, { color: colors.primary }]}>PERSONAL RECORDS</Text>
                    <Text style={[styles.pr, { color: colors.textPrimary }]}>
                        Bench: <Text style={{ fontWeight: 'bold', color: colors.primary }}>{bench.weight}</Text> kg
                        {bench.date ? <Text style={{ color: colors.textSecondary }}> · {new Date(bench.date).toLocaleDateString()}</Text> : null}
                    </Text>
                    <Text style={[styles.pr, { color: colors.textPrimary }]}>
                        Squat: <Text style={{ fontWeight: 'bold', color: colors.success }}>{squat.weight}</Text> kg
                        {squat.date ? <Text style={{ color: colors.textSecondary }}> · {new Date(squat.date).toLocaleDateString()}</Text> : null}
                    </Text>
                    <Text style={[styles.pr, { color: colors.textPrimary }]}>
                        Deadlift: <Text style={{ fontWeight: 'bold', color: colors.warning }}>{deadlift.weight}</Text> kg
                        {deadlift.date ? <Text style={{ color: colors.textSecondary }}> · {new Date(deadlift.date).toLocaleDateString()}</Text> : null}
                    </Text>
                </FadeInView>

                <FadeInView delay={300} style={[styles.infoSection, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary }]}>
                    <View style={[styles.glowLineTop, { backgroundColor: colors.accent || colors.primary }]} />
                    <Text style={[styles.infoTitle, { color: colors.accent || colors.primary, marginBottom: 16 }]}>SYSTEM STATS (EVALUATION)</Text>
                    
                    <View style={styles.statGrid}>
                        <StatItem label="STR" value={Math.floor((bench.weight + squat.weight + deadlift.weight) / 10)} fullLabel="STRENGTH" color={colors.primary} />
                        <StatItem label="VIT" value={Math.min(99, Math.floor(workouts.length / 2 + profile.streak * 2))} fullLabel="VITALITY" color={colors.success} />
                        <StatItem label="AGI" value={Math.min(99, Math.floor((profile.customExercises?.length || 0) * 5 + 10))} fullLabel="AGILITY" color={colors.accent || colors.primary} />
                        <StatItem label="INT" value={Math.min(99, Math.floor(avgIntensity * 8))} fullLabel="INTELLIGENCE" color={colors.warning} />
                    </View>
                    <Text style={[styles.hint, { color: colors.textSecondary, textAlign: 'center', marginTop: 12 }]}>Stats are automatically adjusted based on current battle data.</Text>
                </FadeInView>

                <FadeInView delay={400} style={[styles.infoSection, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <Text style={[styles.infoTitle, { color: colors.primary }]}>STATS SUMMARY</Text>
                    <Row label="Total workouts" value={`${workouts.length}`} colors={colors} />
                    <Row label="Total hours trained" value={totalHoursTrained(workouts).toFixed(1)} colors={colors} />
                    <Row label="Average intensity" value={avgIntensity.toFixed(1)} colors={colors} />
                    <Row label="Total XP" value={`${Math.floor(profile.totalXP)}`} colors={colors} />
                    <Row label="Level" value={`${levelInfo.level}`} colors={colors} />
                </FadeInView>

                <FadeInView delay={400} style={[styles.infoSection, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <Text style={[styles.infoTitle, { color: colors.primary }]}>WEEKLY SUMMARY</Text>
                    <Text style={[styles.wowHead, { color: colors.textSecondary }]}>This week vs last week</Text>
                    <Row label="Volume (kg)" value={`${Math.round(wow.thisWeek.volume)} / ${Math.round(wow.lastWeek.volume)}`} colors={colors} />
                    <Row label="Workouts" value={`${wow.thisWeek.workouts} / ${wow.lastWeek.workouts}`} colors={colors} />
                    <Row
                        label="Avg intensity"
                        value={`${wow.thisWeek.workouts ? wow.thisWeek.avgIntensity.toFixed(1) : '—'} / ${
                            wow.lastWeek.workouts ? wow.lastWeek.avgIntensity.toFixed(1) : '—'
                        }`}
                        colors={colors}
                    />
                </FadeInView>

                <FadeInView delay={500} style={[styles.infoSection, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <Text style={[styles.infoTitle, { color: colors.primary }]}>CUSTOM EXERCISES</Text>
                    <View style={styles.addExerciseRow}>
                        <TextInput
                            style={[styles.exerciseInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
                            placeholder="e.g. Incline Dumbbell Press"
                            placeholderTextColor={colors.textSecondary}
                            value={customExerciseName}
                            onChangeText={setCustomExerciseName}
                            maxLength={30}
                        />
                        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primaryGlow || colors.transparentPrimary, borderColor: colors.primary }]} onPress={handleAddCustomExercise}>
                            <Text style={[styles.addBtnText, { color: colors.primary }]}>ADD</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>These will appear along with default exercises in the Log Raid screen.</Text>
                </FadeInView>

                <FadeInView delay={600} style={[styles.infoSection, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <Text style={[styles.infoTitle, { color: colors.primary }]}>APPEARANCE</Text>
                    
                    <View style={[styles.rowBetween, { marginBottom: 16 }]}>
                        <Text style={{ color: colors.textPrimary, fontSize: 15 }}>Dark mode</Text>
                        <Switch
                            value={isDark}
                            onValueChange={(v) => setDarkMode(v)}
                            trackColor={{ false: colors.border, true: colors.transparentPrimaryMedium }}
                            thumbColor={isDark ? colors.primary : colors.textSecondary}
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.syncBtn, { borderColor: colors.accent || colors.primary, backgroundColor: 'rgba(0, 212, 255, 0.05)' }]} 
                        onPress={() => setIsInventoryModalVisible(true)}
                    >
                        <Text style={[styles.syncBtnText, { color: colors.accent || colors.primary }]}>
                            OPEN HUNTER'S STASH (LOOT) ⚔
                        </Text>
                    </TouchableOpacity>
                    
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>Customize your profile with unlocked auras and titles.</Text>
                </FadeInView>

                <FadeInView delay={700}>
                    <View style={[styles.about, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, marginBottom: 20 }]}>
                        <Text style={[styles.aboutTitle, { color: colors.primary }]}>ABOUT</Text>
                        <Text style={[styles.aboutBody, { color: colors.textSecondary }]}>
                            Hunter Gate: Gym log tracker is a local-first training log with XP, ranks, and quests. Data synchronized via Hunter ID.
                        </Text>
                        <Text style={[styles.aboutVer, { color: colors.textSecondary }]}>Version 1.1.0</Text>
                    </View>

                    {/* Hunter Sync Section */}
                    <View style={[styles.infoSection, { borderColor: colors.primary, backgroundColor: colors.backgroundSecondary }]}>
                        <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
                        <Text style={[styles.infoTitle, { color: colors.primary }]}>⟨ HUNTER SYNC ⟩</Text>
                        
                        <View style={styles.uidContainer}>
                            <Text style={[styles.uidLabel, { color: colors.textSecondary }]}>YOUR HUNTER ID:</Text>
                            <TouchableOpacity onPress={copyUid} style={styles.uidRow}>
                                <Text style={[styles.uidText, { color: colors.textPrimary }]} numberOfLines={1}>
                                    {profile?.uid || 'INITIALIZING...'}
                                </Text>
                                <Ionicons name="copy-outline" size={16} color={colors.primary} style={{ marginLeft: 8 }} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 16 }]}>
                            Use this ID to sync your progress to another device or backup your data.
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                            <TouchableOpacity 
                                style={[styles.syncBtn, { borderColor: colors.primary, flex: 1 }]} 
                                onPress={() => setIsSyncModalVisible(true)}
                            >
                                <Text style={[styles.syncBtnText, { color: colors.primary }]}>CONNECT SYSTEM</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.syncBtn, { borderColor: colors.success, flex: 1, backgroundColor: colors.transparentSuccess }]} 
                                onPress={handleManualSync}
                                disabled={isSyncing}
                            >
                                <Text style={[styles.syncBtnText, { color: colors.success }]}>
                                    {isSyncing ? 'SYNCING...' : 'SYNC NOW ✦'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity 
                            style={[styles.syncBtn, { borderColor: colors.warning, backgroundColor: 'rgba(255, 170, 0, 0.1)' }]} 
                            onPress={handleShareUid}
                        >
                            <Text style={[styles.syncBtnText, { color: colors.warning }]}>BACKUP HUNTER ID (RECOVERY KEY) ⚷</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                        style={[styles.exportBtn, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]} 
                        onPress={handleExport}
                    >
                        <Text style={[styles.exportText, { color: colors.textSecondary }]}>EXPORT RAW DATA ⤓</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.dangerBtn} 
                        onPress={handleClearData}
                    >
                        <Text style={styles.dangerBtnText}>WIPE SYSTEM DATA ☠</Text>
                    </TouchableOpacity>

                    <View style={{ height: 60 }} />
                </FadeInView>
            </ScrollView>
        </FadeInView>

        {/* Sync Modal */}
        <Modal
            visible={isSyncModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsSyncModalVisible(false)}
        >
            <TouchableOpacity 
                activeOpacity={1} 
                style={styles.modalOverlay} 
                onPress={() => setIsSyncModalVisible(false)}
            >
                <TouchableOpacity 
                    activeOpacity={1} 
                    style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary }]}
                    onPress={() => {}}
                >
                    <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.modalTitle, { color: colors.primary }]}>⟨ CONNECT HUNTER SYSTEM ⟩</Text>
                    <Text style={[styles.modalHint, { color: colors.textSecondary }]}>Enter the Hunter ID from your other device to synchronize battle records.</Text>
                    
                    <TextInput
                        style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
                        value={syncUid}
                        onChangeText={setSyncUid}
                        placeholder="hunter-xxxx-xxxx"
                        placeholderTextColor="#555"
                        autoCapitalize="none"
                    />

                    <View style={styles.modalButtons}>
                        <TouchableOpacity 
                            style={[styles.modalBtn, { borderColor: colors.textSecondary }]} 
                            onPress={() => setIsSyncModalVisible(false)}
                        >
                            <Text style={{ color: colors.textSecondary }}>CANCEL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.modalBtn, { borderColor: colors.primary, backgroundColor: colors.transparentPrimary }]} 
                            onPress={handleSyncConnect}
                            disabled={isSyncing}
                        >
                            <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                                {isSyncing ? 'CONNECTING...' : 'SYNC & LOAD'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>

        {/* Android Edit Modal */}
        <Modal
            visible={isEditModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsEditModalVisible(false)}
        >
            <TouchableOpacity 
                activeOpacity={1} 
                style={styles.modalOverlay} 
                onPress={() => setIsEditModalVisible(false)}
            >
                <TouchableOpacity 
                    activeOpacity={1} 
                    style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary }]}
                    onPress={() => {}}
                >
                    <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.modalTitle, { color: colors.primary }]}>⟨ SYSTEM IDENTITY ⟩</Text>
                    <Text style={[styles.modalHint, { color: colors.textSecondary }]}>Enter your hunter name to register in the system.</Text>
                    
                    <TextInput
                        style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
                        value={tempName}
                        onChangeText={setTempName}
                        placeholder="Hunter Name"
                        placeholderTextColor={colors.textSecondary}
                        autoFocus={true}
                        maxLength={20}
                    />

                    <View style={styles.modalButtons}>
                        <TouchableOpacity 
                            style={[styles.modalBtn, { borderColor: colors.border }]} 
                            onPress={() => setIsEditModalVisible(false)}
                        >
                            <Text style={{ color: colors.textSecondary, fontWeight: 'bold' }}>CANCEL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.modalBtn, { borderColor: colors.primary, backgroundColor: colors.transparentPrimary }]} 
                            onPress={saveName}
                        >
                            <Text style={{ color: colors.primary, fontWeight: 'bold' }}>REGISTER</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>

        {/* Inventory Modal */}
        <Modal
            visible={isInventoryModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setIsInventoryModalVisible(false)}
        >
            <TouchableOpacity 
                activeOpacity={1} 
                style={styles.modalOverlay} 
                onPress={() => setIsInventoryModalVisible(false)}
            >
                <TouchableOpacity 
                    activeOpacity={1} 
                    style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.accent || colors.primary, maxHeight: '80%' }]}
                    onPress={() => {}}
                >
                    <View style={[styles.glowLineTop, { backgroundColor: colors.accent || colors.primary }]} />
                    <Text style={[styles.modalTitle, { color: colors.accent || colors.primary }]}>⟨ HUNTER'S STASH ⟩</Text>
                    <Text style={[styles.modalHint, { color: colors.textSecondary }]}>Collect loot by completing system objectives and unlocking achievements.</Text>
                    
                    <ScrollView style={{ marginVertical: 20 }}>
                        {INVENTORY_ITEMS.map((item) => {
                            const inventory = profile?.inventory || [];
                            const equipped = profile?.equipped || {};
                            const isUnlocked = inventory.includes(item.id);
                            const isEquipped = equipped[item.type] === item.id;
                            
                            return (
                                <TouchableOpacity 
                                    key={item.id}
                                    disabled={!isUnlocked}
                                    onPress={() => handleEquip(item)}
                                    style={[
                                        styles.inventoryItem,
                                        { 
                                            borderColor: isEquipped ? (colors.accent || colors.primary) : colors.border,
                                            opacity: isUnlocked ? 1 : 0.5,
                                            backgroundColor: isEquipped ? 'rgba(0, 212, 255, 0.05)' : colors.background
                                        }
                                    ]}
                                >
                                    <View style={styles.inventoryItemInfo}>
                                        <Text style={[styles.itemType, { color: colors.textSecondary }]}>{item.type.toUpperCase()}</Text>
                                        <Text style={[styles.itemName, { color: isUnlocked ? colors.textPrimary : colors.textSecondary }]}>
                                            {item.name} {isEquipped ? '✦' : ''}
                                        </Text>
                                        <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>
                                            {isUnlocked ? item.description : `LOCKED: ${item.requirement}`}
                                        </Text>
                                    </View>
                                    <View style={[styles.equipStatus, { borderColor: isUnlocked ? (isEquipped ? (colors.accent || colors.primary) : colors.border) : colors.border }]}>
                                        {isEquipped ? (
                                            <Ionicons name="checkmark-circle" size={24} color={colors.accent || colors.primary} />
                                        ) : (
                                            <Ionicons name={isUnlocked ? "ellipse-outline" : "lock-closed"} size={20} color={colors.textSecondary} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <TouchableOpacity 
                        style={[
                            styles.modalBtn, 
                            { 
                                backgroundColor: colors.accent || colors.primary, 
                                borderColor: colors.accent || colors.primary,
                                marginTop: 10, 
                                flex: 0, 
                                alignSelf: 'center', 
                                minWidth: 200,
                                shadowColor: colors.accent || colors.primary,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 5
                            }
                        ]} 
                        onPress={() => {
                            setIsInventoryModalVisible(false);
                        }}
                    >
                        <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 13, letterSpacing: 1 }}>CLOSE STASH</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    </View>
    );
}

function Row({ label, value, colors }) {
    return (
        <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{value}</Text>
        </View>
    );
}

function StatItem({ label, value, fullLabel, color }) {
    return (
        <View style={styles.statItem}>
            <View style={[styles.statRing, { borderColor: color }]}>
                <Text style={[styles.statValue, { color }]}>{value}</Text>
            </View>
            <Text style={[styles.statLabel, { color }]}>{label}</Text>
            <Text style={[styles.statFullLabel, { color: '#888' }]}>{fullLabel}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingBottom: 16,
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    title: { fontSize: 20, fontWeight: 'bold', letterSpacing: 3 },
    content: { flex: 1, padding: SIZES.padding },
    profileCard: {
        alignItems: 'center',
        padding: 30,
        borderRadius: SIZES.radiusLg || 16,
        borderWidth: 1,
        marginBottom: 20,
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
    avatarPlaceholder: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarWrap: { marginBottom: 16, position: 'relative' },
    editIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    avatarText: { fontSize: 32, fontWeight: 'bold' },
    nameText: { fontSize: 24, fontWeight: 'bold', marginBottom: 6 },
    rankBadge: {
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    rankText: { fontWeight: 'bold', fontSize: 13, letterSpacing: 2 },
    shadowArmyText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5, marginTop: 4, marginBottom: 8 },
    joinDate: { fontSize: 12 },
    infoSection: {
        padding: SIZES.padding,
        borderRadius: SIZES.radiusSm || 12,
        borderWidth: 1,
        marginBottom: 16,
        position: 'relative',
        overflow: 'hidden',
    },
    statGrid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    statItem: { alignItems: 'center' },
    statRing: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    statLabel: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    statFullLabel: { fontSize: 8, marginTop: 2, letterSpacing: 0.5 },
    statValue: { fontSize: 18, fontWeight: 'bold' },
    infoTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 12, letterSpacing: 2 },
    pr: { fontSize: 14, marginBottom: 8 },
    wowHead: { fontSize: 12, marginBottom: 10 },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(128,128,128,0.2)',
    },
    infoLabel: { fontSize: 14 },
    infoValue: { fontSize: 14, fontWeight: 'bold' },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    hint: { fontSize: 11, marginTop: 8 },
    actionBtn: { borderWidth: 1, padding: 16, borderRadius: SIZES.radiusSm || 12, alignItems: 'center', marginBottom: 16 },
    actionBtnText: { fontSize: 13, fontWeight: 'bold', letterSpacing: 2 },
    dangerBtn: { borderWidth: 1, padding: 16, borderRadius: SIZES.radiusSm || 12, alignItems: 'center', marginBottom: 24, backgroundColor: 'rgba(255,51,51,0.1)' },
    dangerBtnText: { fontSize: 13, fontWeight: 'bold', letterSpacing: 2 },
    uidContainer: {
        marginBottom: 12,
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
    },
    uidLabel: { fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
    uidRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    uidText: { fontSize: 13, flex: 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    syncBtn: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    syncBtnText: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    exportBtn: {
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        marginBottom: 16,
    },
    exportText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    addExerciseRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    exerciseInput: { flex: 1, borderWidth: 1, padding: 12, borderRadius: SIZES.radiusSm || 8, fontSize: 14 },
    addBtn: { borderWidth: 1, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', borderRadius: SIZES.radiusSm || 8 },
    addBtnText: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    about: { borderWidth: 1, borderRadius: SIZES.radius, padding: SIZES.padding },
    aboutTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, letterSpacing: 2 },
    aboutBody: { fontSize: 13, lineHeight: 20 },
    aboutVer: { marginTop: 10, fontSize: 11 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        padding: 24,
        borderRadius: SIZES.radiusLg || 16,
        borderWidth: 1,
        position: 'relative',
        overflow: 'hidden',
    },
    modalTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalHint: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 20,
    },
    modalInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 14,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        height: 48,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inventoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    inventoryItemInfo: {
        flex: 1,
    },
    itemType: {
        fontSize: 9,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    itemDesc: {
        fontSize: 11,
    },
    equipStatus: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    auraContainer: {
        position: 'absolute',
        top: -10,
        left: -10,
        right: -10,
        bottom: -10,
        borderRadius: 20,
        borderWidth: 2,
    },
});
