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
import SystemActionModal from '../components/SystemActionModal';

export default function ProfileScreen() {
    const { colors, isDark, setDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const [profile, setProfile] = useState(null);
    const [workouts, setWorkouts] = useState([]);
    const [customExerciseName, setCustomExerciseName] = useState('');
    const [customExerciseType, setCustomExerciseType] = useState('weighted');
    const [isSyncModalVisible, setIsSyncModalVisible] = useState(false);
    const [isInventoryModalVisible, setIsInventoryModalVisible] = useState(false);
    const [syncUid, setSyncUid] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
    const [isGuideModalVisible, setIsGuideModalVisible] = useState(false);
    const [isLicenseModalVisible, setIsLicenseModalVisible] = useState(false);
    const [isDemoModalVisible, setIsDemoModalVisible] = useState(false);

    const [actionModal, setActionModal] = useState({
        visible: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: null,
        onConfirm: () => {},
        type: 'SYSTEM'
    });

    const showModal = (config) => {
        setActionModal({
            visible: true,
            title: config.title || 'System Message',
            message: config.message || '',
            confirmText: config.confirmText || 'OK',
            cancelText: config.cancelText || null,
            onConfirm: () => {
                if (config.onConfirm) config.onConfirm();
                setActionModal(prev => ({ ...prev, visible: false }));
            },
            type: config.type || 'SYSTEM'
        });
    };

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
            let nextProfile = { ...data.profile };
            let newUnlocks = InventoryService.checkUnlocks(nextProfile, data.workouts);

            // Automatically grant pre-unlocked items if not already in inventory
            const preUnlockedItems = INVENTORY_ITEMS.filter(item => item.preUnlocked && !nextProfile.inventory.includes(item.id));
            if (preUnlockedItems.length > 0) {
                newUnlocks = [...newUnlocks, ...preUnlockedItems.map(item => item.id)];
            }

            if (newUnlocks.length > 0) {
                nextProfile.inventory = [...(nextProfile.inventory || []), ...newUnlocks];
                // Ensure unique items
                nextProfile.inventory = Array.from(new Set(nextProfile.inventory));
                await StorageService.saveUserProfile(nextProfile);
            }
            setProfile(nextProfile);
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
            showModal({ title: 'SYSTEM UPDATED', message: `Welcome, Hunter ${tempName.trim()}.`, type: 'SUCCESS' });
        } else {
            showModal({ title: 'System Error', message: 'Hunter name cannot be empty.', type: 'DANGER' });
        }
    };

    const handleExport = async () => {
        try {
            const data = await StorageService.exportData();
            await Share.share({ message: data, title: 'Hunter Stats Backup' });
        } catch {
            showModal({ title: 'ERROR', message: 'E-Rank performance: Export failed.', type: 'DANGER' });
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
                showModal({ title: 'SYNC SUCCESS', message: 'Equipment and stats synchronized from the cloud.', type: 'SUCCESS' });
            } else {
                showModal({ title: 'Sync Failed', message: 'Could not find data for this Hunter ID.', type: 'DANGER' });
            }
        } catch (error) {
            console.error(error);
            showModal({ title: 'Sync Error', message: 'An error occurred during synchronization.', type: 'DANGER' });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleManualSync = async () => {
        if (!profile?.uid) return;
        setIsSyncing(true);
        try {
            await StorageService.saveUserProfile(profile);
            showModal({ title: 'SYNC COMPLETE', message: 'Your local battle data has been sent to the cloud.', type: 'SUCCESS' });
        } catch {
            showModal({ title: 'Sync Error', message: 'Failed to reach the cloud server.', type: 'DANGER' });
        } finally {
            setIsSyncing(false);
        }
    };

    const copyUid = async () => {
        if (!profile?.uid) return;
        await Clipboard.setStringAsync(profile.uid);
        showModal({ title: 'SYSTEM SYNC', message: 'Hunter ID copied to clipboard. Keep this safe for account recovery.', type: 'SYSTEM' });
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
        const exists = currentCustoms.some(ex => 
            (typeof ex === 'string' ? ex : ex.name).toLowerCase() === name.toLowerCase()
        );

        if (exists) {
            showModal({ title: 'System Error', message: 'Exercise already exists in the system.', type: 'DANGER' });
            return;
        }

        const newExercise = { 
            name, 
            type: customExerciseType,
            isTimed: customExerciseType === 'timed'
        };

        const nextProfile = {
            ...profile,
            customExercises: [...currentCustoms, newExercise],
        };

        await StorageService.saveUserProfile(nextProfile);
        setProfile(nextProfile);
        setCustomExerciseName('');
        setCustomExerciseType('weighted');
        showModal({ title: 'Exercise Registered', message: `"${name}" (${customExerciseType.toUpperCase()}) added to the Hunter log.`, type: 'SUCCESS' });
    };

    const handleClearData = () => {
        showModal({
            title: 'SYSTEM RESET',
            message: 'This wipes workouts, XP, achievements, and settings on this device. PROCEED?',
            confirmText: 'RESET',
            cancelText: 'CANCEL',
            type: 'DANGER',
            onConfirm: async () => {
                await StorageService.clearAllData();
                await setDarkMode(true);
                showModal({ title: 'Reset complete', message: 'The system has been cleared.', type: 'SUCCESS' });
                loadData();
            }
        });
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
            case 'aura_faint': return 'rgba(255, 255, 255, 0.4)';
            default: return null;
        }
    };

    const getBorderColor = (borderId) => {
        switch (borderId) {
            case 'border_gold': return '#FFD700';
            case 'border_neon': return '#00f2ff';
            case 'border_carbon': return '#333333';
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
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.helpBtn} onPress={() => setIsGuideModalVisible(true)}>
                            <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: colors.primary }]}>⟨ HUNTER PROFILE ⟩</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            <TouchableOpacity onPress={() => setIsLicenseModalVisible(true)} style={{ padding: 2 }}>
                                <Ionicons name="card-outline" size={26} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsSettingsModalVisible(true)} style={{ padding: 2 }}>
                                <Ionicons name="settings-outline" size={26} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
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

                <FadeInView delay={250} style={{ paddingHorizontal: SIZES.padding, marginBottom: 16 }}>
                    <TouchableOpacity 
                        style={[
                            styles.syncBtn, 
                            { 
                                borderColor: colors.accent || colors.primary, 
                                backgroundColor: 'rgba(0, 212, 255, 0.08)',
                                height: 50,
                                borderRadius: 12,
                                borderStyle: 'dashed'
                            }
                        ]} 
                        onPress={() => setIsInventoryModalVisible(true)}
                    >
                        <Text style={[styles.syncBtnText, { color: colors.accent || colors.primary, fontSize: 13, letterSpacing: 2 }]}>
                            ⟨ OPEN HUNTER'S STASH ⟩ ⚔
                        </Text>
                    </TouchableOpacity>
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
                    <TouchableOpacity 
                        style={[styles.demoBtn, { borderColor: colors.warning, borderStyle: 'dashed', marginTop: 16 }]}
                        onPress={() => setIsDemoModalVisible(true)}
                    >
                        <Ionicons name="eye-outline" size={18} color={colors.warning} />
                        <Text style={[styles.demoBtnText, { color: colors.warning }]}>PREVIEW FUTURE EVOLUTION (S-RANK)</Text>
                    </TouchableOpacity>
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
                    
                    <View style={styles.typeSelectorHeader}>
                        <TouchableOpacity 
                            style={[
                                styles.typeChip, 
                                { borderColor: colors.border },
                                customExerciseType === 'weighted' && { borderColor: colors.primary, backgroundColor: colors.transparentPrimary }
                            ]} 
                            onPress={() => setCustomExerciseType('weighted')}
                        >
                            <Text style={[styles.typeText, { color: colors.textSecondary }, customExerciseType === 'weighted' && { color: colors.primary }]}>WEIGHTED</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[
                                styles.typeChip, 
                                { borderColor: colors.border },
                                customExerciseType === 'bodyweight' && { borderColor: colors.success, backgroundColor: colors.transparentSuccess }
                            ]} 
                            onPress={() => setCustomExerciseType('bodyweight')}
                        >
                            <Text style={[styles.typeText, { color: colors.textSecondary }, customExerciseType === 'bodyweight' && { color: colors.success }]}>BODYWEIGHT</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[
                                styles.typeChip, 
                                { borderColor: colors.border },
                                customExerciseType === 'timed' && { borderColor: colors.warning, backgroundColor: 'rgba(255,170,0,0.1)' }
                            ]} 
                            onPress={() => setCustomExerciseType('timed')}
                        >
                            <Text style={[styles.typeText, { color: colors.textSecondary }, customExerciseType === 'timed' && { color: colors.warning }]}>TIMED</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.addExerciseRow}>
                        <TextInput
                            style={[styles.exerciseInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
                            placeholder="e.g. Incline Bench"
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

                    <View style={{ height: 100 }} />
                </ScrollView>
            </FadeInView>

            {/* System Settings Modal */}
            <Modal
                visible={isSettingsModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsSettingsModalVisible(false)}
            >
                <TouchableOpacity 
                    activeOpacity={1} 
                    style={styles.modalOverlay} 
                    onPress={() => setIsSettingsModalVisible(false)}
                >
                    <TouchableOpacity 
                        activeOpacity={1} 
                        style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary, height: '75%' }]}
                        onPress={() => {}}
                    >
                        <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.primary }]}>⟨ SYSTEM SETTINGS ⟩</Text>
                            <TouchableOpacity onPress={() => setIsSettingsModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={[styles.settingSectionTitle, { color: colors.primary }]}>APPEARANCE</Text>
                            <View style={[styles.settingRow, { borderColor: colors.border }]}>
                                <View>
                                    <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>DARK MODE</Text>
                                    <Text style={[styles.settingSub, { color: colors.textSecondary }]}>Optimize terminal for night raids.</Text>
                                </View>
                                <Switch
                                    value={isDark}
                                    onValueChange={(v) => setDarkMode(v)}
                                    trackColor={{ false: colors.border, true: colors.transparentPrimaryMedium }}
                                    thumbColor={isDark ? colors.primary : colors.textSecondary}
                                />
                            </View>

                            <Text style={[styles.settingSectionTitle, { color: colors.primary, marginTop: 24 }]}>CLOUD SYNCHRONIZATION</Text>
                            <View style={[styles.settingCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                                <Text style={[styles.uidLabel, { color: colors.textSecondary }]}>HUNTER ID: {profile?.uid || 'INITIALIZING...'}</Text>
                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                                    <TouchableOpacity style={[styles.syncBtnSmall, { borderColor: colors.primary }]} onPress={() => { setIsSettingsModalVisible(false); setIsSyncModalVisible(true); }}>
                                        <Text style={[styles.syncBtnText, { color: colors.primary }]}>CONNECT</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.syncBtnSmall, { borderColor: colors.success, backgroundColor: colors.transparentSuccess }]} onPress={handleManualSync}>
                                        <Text style={[styles.syncBtnText, { color: colors.success }]}>PUSH ✦</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.syncBtnSmall, { borderColor: colors.warning }]} onPress={copyUid}>
                                        <Text style={[styles.syncBtnText, { color: colors.warning }]}>COPY</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity 
                                    style={[styles.syncBtn, { borderColor: colors.warning, backgroundColor: 'rgba(255, 170, 0, 0.05)', marginTop: 12 }]} 
                                    onPress={handleShareUid}
                                >
                                    <Text style={[styles.syncBtnText, { color: colors.warning }]}>BACKUP RECOVERY KEY ⚷</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.settingSectionTitle, { color: colors.danger, marginTop: 24 }]}>DANGER ZONE (SYSTEM RESET)</Text>
                            <TouchableOpacity 
                                style={[styles.resetBtn, { borderColor: colors.danger, backgroundColor: 'rgba(255, 68, 68, 0.05)' }]} 
                                onPress={() => {
                                    setIsSettingsModalVisible(false);
                                    handleClearData();
                                }}
                            >
                                <Text style={[styles.resetBtnText, { color: colors.danger }]}>INITIATE SYSTEM RESET ☠</Text>
                            </TouchableOpacity>
                            <Text style={[styles.settingSub, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
                                Resets all local battle data, XP, and custom exercises. Proceed with caution.
                            </Text>

                            <View style={{ height: 40 }} />
                            <View style={[styles.about, { borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.02)' }]}>
                                <Text style={[styles.aboutTitle, { color: colors.primary }]}>ABOUT SYSTEM</Text>
                                <Text style={[styles.aboutBody, { color: colors.textSecondary }]}>
                                    Hunter Gate is a local-first training log with RPG-inspired progression. Data is stored locally and syncable via Hunter ID.
                                </Text>
                                <Text style={[styles.aboutVer, { color: colors.textSecondary }]}>VERSION 1.1.0 · BUILD_ID_774</Text>
                            </View>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

        {/* Sync Modal */}
        <Modal
            visible={isSyncModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsSyncModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity 
                    activeOpacity={1} 
                    style={StyleSheet.absoluteFill} 
                    onPress={() => setIsSyncModalVisible(false)} 
                />
                <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary }]}>
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
                </View>
            </View>
        </Modal>

        {/* Android Edit Modal */}
        <Modal
            visible={isEditModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsEditModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity 
                    activeOpacity={1} 
                    style={StyleSheet.absoluteFill} 
                    onPress={() => setIsEditModalVisible(false)} 
                />
                <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary }]}>
                    <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.modalTitle, { color: colors.primary }]}>⟨ SYSTEM IDENTITY ⟩</Text>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: 16 }]}>HUNTER NAME</Text>
                    <TextInput
                        style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary, marginBottom: 16 }]}
                        placeholder="Enter your hunter name"
                        placeholderTextColor={colors.textSecondary}
                        value={tempName}
                        onChangeText={setTempName}
                        maxLength={20}
                    />
                     <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>SELECT ACTIVE TITLE</Text>
                    <ScrollView 
                        style={{ maxHeight: 120, marginVertical: 8 }}
                        showsVerticalScrollIndicator={true}
                    >
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            <TouchableOpacity 
                                onPress={async () => {
                                    const next = { ...profile, equipped: { ...(profile.equipped || {}), title: null } };
                                    await StorageService.saveUserProfile(next);
                                    setProfile(next);
                                }}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: !profile.equipped?.title ? colors.primary : colors.border,
                                    backgroundColor: !profile.equipped?.title ? colors.transparentPrimary : 'transparent'
                                }}
                            >
                                <Text style={{ color: !profile.equipped?.title ? colors.primary : colors.textSecondary, fontSize: 11, fontWeight: 'bold' }}>NO TITLE</Text>
                            </TouchableOpacity>
                            {(profile.inventory || []).filter(id => id.startsWith('title_')).map(tid => {
                                const item = InventoryService.getItem(tid);
                                if (!item) return null;
                                const isSelected = profile.equipped?.title === tid;
                                return (
                                    <TouchableOpacity 
                                        key={tid}
                                        onPress={async () => {
                                            const next = { ...profile, equipped: { ...(profile.equipped || {}), title: tid } };
                                            await StorageService.saveUserProfile(next);
                                            setProfile(next);
                                        }}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 16,
                                            borderWidth: 1,
                                            borderColor: isSelected ? colors.primary : colors.border,
                                            backgroundColor: isSelected ? colors.transparentPrimary : 'transparent'
                                        }}
                                    >
                                        <Text style={{ color: isSelected ? colors.primary : colors.textSecondary, fontSize: 11, fontWeight: 'bold' }}>{item.name.toUpperCase()}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>

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
                </View>
            </View>
        </Modal>

        {/* Inventory Modal */}
        <Modal
            visible={isInventoryModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setIsInventoryModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity 
                    activeOpacity={1} 
                    style={StyleSheet.absoluteFill} 
                    onPress={() => setIsInventoryModalVisible(false)} 
                />
                <View 
                    style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.accent || colors.primary, maxHeight: '85%' }]}
                >
                    <View style={[styles.glowLineTop, { backgroundColor: colors.accent || colors.primary }]} />
                    <Text style={[styles.modalTitle, { color: colors.accent || colors.primary }]}>⟨ HUNTER'S STASH ⟩</Text>
                    <Text style={[styles.modalHint, { color: colors.textSecondary }]}>Collect loot by completing system objectives and unlocking achievements.</Text>
                    
                    <ScrollView 
                        style={{ marginVertical: 10 }}
                        showsVerticalScrollIndicator={true}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    >
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
                                            backgroundColor: isEquipped ? 'rgba(0, 212, 255, 0.1)' : colors.background
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
                </View>
            </View>
        </Modal>

        {/* Monarch's License Modal */}
        <Modal visible={isLicenseModalVisible} transparent animationType="fade" onRequestClose={() => setIsLicenseModalVisible(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => setIsLicenseModalVisible(false)}>
                <FadeInView style={[styles.licenseCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary }]}>
                    <View style={[styles.licenseHeader, { backgroundColor: colors.primary }]}>
                        <Text style={styles.licenseHeaderText}>HUNTER ASSOCIATION OFFICIAL LICENSE</Text>
                    </View>
                    <View style={styles.licenseBody}>
                        <View style={{ flexDirection: 'row', gap: 20, marginBottom: 20 }}>
                            <View style={[styles.licenseAvatar, { borderColor: colors.primary, backgroundColor: colors.background }]}>
                                <Text style={[styles.licenseAvatarText, { color: colors.primary }]}>
                                    {(profile.name || 'H').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={{ flex: 1, justifyContent: 'center' }}>
                                <Text style={[styles.licenseLabel, { color: colors.textSecondary }]}>NAME</Text>
                                <Text style={[styles.licenseValue, { color: colors.textPrimary, fontSize: 20 }]}>{profile.name}</Text>
                                <Text style={[styles.licenseLabel, { color: colors.textSecondary, marginTop: 10 }]}>RANK</Text>
                                <Text style={[styles.licenseValue, { color: colors.success, fontSize: 24, fontWeight: 'bold' }]}>{rank.toUpperCase()}</Text>
                            </View>
                        </View>
                        
                        <View style={styles.licenseStatsGrid}>
                            <View>
                                <Text style={[styles.licenseLabel, { color: colors.textSecondary }]}>LEVEL</Text>
                                <Text style={[styles.licenseValue, { color: colors.primary }]}>{levelInfo.level}</Text>
                            </View>
                            <View>
                                <Text style={[styles.licenseLabel, { color: colors.textSecondary }]}>TOTAL XP</Text>
                                <Text style={[styles.licenseValue, { color: colors.primary }]}>{Math.floor(profile.totalXP)}</Text>
                            </View>
                            <View>
                                <Text style={[styles.licenseLabel, { color: colors.textSecondary }]}>ID</Text>
                                <Text style={[styles.licenseValue, { color: colors.textSecondary, fontSize: 10 }]}>{profile.uid?.slice(0, 12)}...</Text>
                            </View>
                        </View>

                        <View style={styles.licenseFooter}>
                            <Ionicons name="shield-checkmark" size={40} color={colors.primary + '40'} />
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 8 }}>ISSUED BY SYSTEM</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 6 }}>GATE COORDINATE: 37.5665° N, 126.9780° E</Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity 
                        style={[styles.shareBtn, { backgroundColor: colors.primary }]} 
                        onPress={() => Share.share({ message: `Hunter ${profile.name} | Rank: ${rank} | Level: ${levelInfo.level}\nDownload Hunter Gate and begin your awakening! ⚔️` })}
                    >
                        <Ionicons name="share-outline" size={20} color="#000" />
                        <Text style={styles.shareBtnText}>SHARE LICENSE</Text>
                    </TouchableOpacity>
                </FadeInView>
            </TouchableOpacity>
        </Modal>

        {/* Future Evolution (S-Rank) Demo Modal */}
        <Modal visible={isDemoModalVisible} transparent animationType="slide" onRequestClose={() => setIsDemoModalVisible(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => setIsDemoModalVisible(false)}>
                <View style={[styles.demoCard, { backgroundColor: '#0a0a0c', borderColor: '#FFD700' }]}>
                    <View style={[styles.glowLineTop, { backgroundColor: '#FFD700' }]} />
                    <View style={[styles.demoHeader, { borderBottomColor: '#222' }]}>
                        <Text style={{ color: '#FFD700', fontWeight: 'bold', letterSpacing: 2 }}>FUTURE EVOLUTION DETECTED</Text>
                        <TouchableOpacity onPress={() => setIsDemoModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={{ padding: 20 }}>
                        <View style={{ alignItems: 'center', marginBottom: 24 }}>
                            <View style={[styles.demoRankCircle, { borderColor: '#FFD700' }]}>
                                <Text style={{ color: '#FFD700', fontSize: 60, fontWeight: 'bold' }}>S</Text>
                            </View>
                            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 12 }}>SHADOW MONARCH</Text>
                            <Text style={{ color: '#FFD700', fontSize: 12, letterSpacing: 3 }}>LEVEL 50 [MAX STATUS]</Text>
                        </View>

                        <View style={[styles.demoStatCard, { backgroundColor: '#151518' }]}>
                            <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: 'bold', marginBottom: 12 }}>COMMANDER-CLASS STATS</Text>
                            <View style={styles.demoStatGrid}>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ color: '#777', fontSize: 10 }}>STR</Text>
                                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>99</Text>
                                </View>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ color: '#777', fontSize: 10 }}>VIT</Text>
                                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>99</Text>
                                </View>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ color: '#777', fontSize: 10 }}>AGI</Text>
                                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>99</Text>
                                </View>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ color: '#777', fontSize: 10 }}>INT</Text>
                                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>99</Text>
                                </View>
                            </View>
                        </View>

                        <View style={{ marginTop: 24, gap: 12 }}>
                            <View style={styles.demoPerk}>
                                <Ionicons name="flash" size={16} color="#FFD700" />
                                <Text style={{ color: '#aaa', fontSize: 12 }}>Absolute Authority: No XP limits for raids.</Text>
                            </View>
                            <View style={styles.demoPerk}>
                                <Ionicons name="people" size={16} color="#FFD700" />
                                <Text style={{ color: '#aaa', fontSize: 12 }}>Shadow Extraction: +10% efficiency on all extracts.</Text>
                            </View>
                        </View>
                    </ScrollView>

                    <TouchableOpacity 
                        style={[styles.demoCloseBtn, { backgroundColor: '#FFD700' }]} 
                        onPress={() => setIsDemoModalVisible(false)}
                    >
                        <Text style={{ color: '#000', fontWeight: 'bold', letterSpacing: 2 }}>KEEP TRAINING TO AWAKEN</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>

        {/* Guide Modal */}
        <Modal
            visible={isGuideModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setIsGuideModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity 
                    activeOpacity={1} 
                    style={StyleSheet.absoluteFill} 
                    onPress={() => setIsGuideModalVisible(false)} 
                />
                <View 
                    style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary, maxHeight: '85%' }]}
                >
                    <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.modalTitle, { color: colors.primary }]}>⟨ SYSTEM GUIDE ⟩</Text>
                    <Text style={[styles.modalHint, { color: colors.textSecondary }]}>Welcome to the Hunter Gate System. Follow these protocols to evolve.</Text>
                    
                    <ScrollView 
                        style={{ marginVertical: 10 }}
                        showsVerticalScrollIndicator={true}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    >
                        <GuideSection 
                            icon="flash" 
                            title="RAIDS (WORKOUTS)" 
                            desc="Log your training 'Raids' daily to earn XP. The more volume and intensity you provide, the faster you level up."
                            colors={colors}
                        />
                        <GuideSection 
                            icon="trending-up" 
                            title="LEVELING & RANKING" 
                            desc="Collect XP to increase your Level. Your 'Rank' (E-Rank to S-Rank) is determined solely by your Level milestone."
                            colors={colors}
                        />
                        <GuideSection 
                            icon="flame" 
                            title="STREAK MULTIPLIER" 
                            desc="Consistency is your greatest weapon. Maintaining a workout streak provides a significant XP multiplier for every raid."
                            colors={colors}
                        />
                        <GuideSection 
                            icon="trophy" 
                            title="HUNTER'S STASH" 
                            desc="Unlock unique Titles, Auras, and Borders by completing hidden achievements and hitting combat PRs."
                            colors={colors}
                        />
                        <GuideSection 
                            icon="people" 
                            title="GLOBAL RANKING" 
                            desc="Compare your combat level against hunters globally. The Top 10 earn elite status in the terminal."
                            colors={colors}
                        />
                    </ScrollView>

                    <TouchableOpacity 
                        style={[styles.modalBtn, { backgroundColor: colors.primary, borderColor: colors.primary, flex: 0, alignSelf: 'center', minWidth: 200 }]} 
                        onPress={() => setIsGuideModalVisible(false)}
                    >
                        <Text style={{ color: '#000', fontWeight: 'bold' }}>I UNDERSTAND</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

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
    </View>
    );
}

function GuideSection({ icon, title, desc, colors }) {
    return (
        <View style={[styles.guideSection, { borderColor: colors.border }]}>
            <View style={[styles.guideIcon, { backgroundColor: colors.transparentPrimary }]}>
                <Ionicons name={icon} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.guideTitle, { color: colors.primary }]}>{title}</Text>
                <Text style={[styles.guideDesc, { color: colors.textSecondary }]}>{desc}</Text>
            </View>
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
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 20,
    },
    settingsBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: { fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
    content: { flex: 1, padding: SIZES.padding },
    settingSectionTitle: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 12 },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    settingLabel: { fontSize: 14, fontWeight: 'bold' },
    settingSub: { fontSize: 11, marginTop: 2 },
    settingCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    syncBtnSmall: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    resetBtn: {
        marginTop: 8,
        padding: 18,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        borderStyle: 'dashed',
    },
    resetBtnText: { fontWeight: 'bold', letterSpacing: 1, fontSize: 13 },
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
    typeSelectorHeader: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    typeChip: { 
        paddingHorizontal: 16, 
        paddingVertical: 8, 
        borderRadius: 20, 
        borderWidth: 1,
        flex: 1,
        alignItems: 'center'
    },
    typeText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    addExerciseRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    exerciseInput: { flex: 1, height: 45, borderRadius: 10, borderWidth: 1, paddingHorizontal: 16, fontSize: 14 },
    addBtn: { paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, justifyContent: 'center' },
    addBtnText: { fontWeight: 'bold', fontSize: 12 },
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
    guideSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
        gap: 16,
    },
    guideIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    guideTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 2,
    },
    guideDesc: {
        fontSize: 11,
        lineHeight: 16,
    },
    helpBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
