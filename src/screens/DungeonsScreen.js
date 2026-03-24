import React, { useState, useCallback, useMemo } from 'react';
import { useSystemNotification } from '../context/SystemNotificationContext';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, Dimensions, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StorageService } from '../services/StorageService';
import { useTheme } from '../context/ThemeContext';
import FadeInView from '../components/FadeInView';
import { SIZES } from '../constants/theme';

const { width } = Dimensions.get('window');

const DUNGEONS = [
    {
        id: 'dungeon_beginner',
        name: 'Instance Dungeon: Rank E',
        rank: 'E',
        type: 'Blue Gate',
        recommendedLevel: 1,
        description: 'A basic training facility for awakening hunters. Focus on fundamental movements.',
        requirements: ['Squat', 'Bench Press', 'Deadlift'],
        targetWorkouts: 5,
        xpReward: 500,
        loot: 'Iron-Willed Title',
        color: '#4ade80',
    },
    {
        id: 'dungeon_intermediate',
        name: 'The Shadow Labyrinth',
        rank: 'C',
        type: 'Blue Gate',
        recommendedLevel: 15,
        description: 'Test your endurance and strength in the depths of the labyrinth.',
        requirements: ['Squat', 'Overhead Press', 'Pull Up', 'Dips'],
        targetWorkouts: 12,
        xpReward: 2500,
        loot: 'Shadow Step Aura',
        color: '#3b82f6',
    },
    {
        id: 'dungeon_advanced',
        name: 'Instance Dungeon: Job Change',
        rank: 'A',
        type: 'Red Gate',
        recommendedLevel: 35,
        description: 'Only high-ranking hunters should attempt this gate. Extreme intensity required.',
        requirements: ['Heavy Deadlift', 'Heavy Squat', 'Weighted Pull Ups'],
        targetWorkouts: 20,
        xpReward: 10000,
        loot: 'S-Rank Evolution',
        color: '#ef4444',
    },
    {
        id: 'dungeon_elite',
        name: 'Antares Memorial',
        rank: 'S',
        type: 'Purple Gate',
        recommendedLevel: 50,
        description: 'The pinnacle of the system. Face the monarch of destruction.',
        requirements: ['Daily 5km Run', 'Elite PR Attempt', 'Full Body Raid'],
        targetWorkouts: 30,
        xpReward: 25000,
        loot: 'Monarch Border',
        color: '#a33fe3',
    }
];

export default function DungeonsScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { showSystemAlert } = useSystemNotification();
    const [activeDungeon, setActiveDungeon] = useState(null);
    const [workouts, setWorkouts] = useState([]);
    const [profile, setProfile] = useState(null);
    const [showGuide, setShowGuide] = useState(false);

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
            setActiveDungeon(data.profile.activeDungeon || null);
        }
    };

    const handleEnterDungeon = (dungeon) => {
        if (activeDungeon) {
            Alert.alert(
                'SYSTEM MESSAGE', 
                'You are already in a dungeon. Abandon current raid to enter this one?', 
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'ABANDON & ENTER', style: 'destructive', onPress: () => startDungeon(dungeon) }
                ]
            );
        } else if (dungeon) {
            startDungeon(dungeon);
        }
    };

    const startDungeon = async (dungeon) => {
        try {
            const dungeonId = dungeon ? dungeon.id : null;
            setActiveDungeon(dungeonId);

            const nextProfile = { 
                ...profile, 
                activeDungeon: dungeonId, 
                dungeonStartedAt: dungeon ? new Date().toISOString() : null 
            };
            
            await StorageService.saveUserProfile(nextProfile);
            setProfile(nextProfile);
            
            if (dungeon) {
                showSystemAlert('Gate Opened', `Entering [${dungeon.name}]`, 'SYSTEM');
            } else {
                showSystemAlert('Gate Closed', 'Dungeon raid abandoned.', 'SYSTEM');
            }
        } catch (error) {
            console.error('Failed to start/abandon dungeon:', error);
            Alert.alert('SYSTEM ERROR', 'Failed to update system state. Please try again.');
            loadData();
        }
    };

    const getDungeonProgress = (dungeonId) => {
        if (activeDungeon !== dungeonId || !profile?.dungeonStartedAt) return 0;
        const dungeon = DUNGEONS.find(d => d.id === dungeonId);
        if (!dungeon) return 0;

        const startDate = new Date(profile.dungeonStartedAt).getTime();
        const relevantWorkouts = workouts.filter(w => 
            new Date(w.date).getTime() >= startDate
        );
        
        return Math.min(1, relevantWorkouts.length / dungeon.targetWorkouts);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
                <View style={{ width: 40 }} />
                <Text style={[styles.title, { color: colors.primary }]}>⟨ INSTANCE DUNGEONS ⟩</Text>
                <TouchableOpacity onPress={() => setShowGuide(true)} style={{ width: 40, alignItems: 'center' }}>
                    <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Select a gate to enter. Clearing dungeons grants massive XP and loot.
                </Text>

                {/* Normal Subjugation Card */}
                <FadeInView delay={50} style={[styles.normalRaidCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <View style={styles.normalRaidHeader}>
                        <Ionicons name="fitness-outline" size={20} color={colors.textPrimary} />
                        <Text style={[styles.normalRaidTitle, { color: colors.textPrimary }]}>NORMAL SUBJUGATION</Text>
                    </View>
                    <Text style={[styles.normalRaidDesc, { color: colors.textSecondary }]}>
                        Standard physical exercises outside of instance gates. Log daily activity to maintain your core hunter stats.
                    </Text>
                    <TouchableOpacity 
                        style={[styles.trainingBtn, { borderColor: colors.primary }]}
                        onPress={() => showSystemAlert('System Message', 'Proceed to LOG terminal for standard raids.', 'SYSTEM')}
                    >
                        <Text style={[styles.trainingBtnText, { color: colors.primary }]}>ACCESS LOG TERMINAL</Text>
                    </TouchableOpacity>
                </FadeInView>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                {DUNGEONS.map((dungeon, index) => {
                    const isActive = activeDungeon === dungeon.id;
                    const progress = getDungeonProgress(dungeon.id);

                    return (
                        <FadeInView key={dungeon.id} delay={index * 100} style={[
                            styles.dungeonCard, 
                            { 
                                backgroundColor: colors.backgroundSecondary, 
                                borderColor: isActive ? dungeon.color : colors.border,
                                borderWidth: isActive ? 2 : 1
                            }
                        ]}>
                            <View style={[styles.rankLabel, { backgroundColor: dungeon.color }]}>
                                <Text style={styles.rankText}>RANK {dungeon.rank}</Text>
                            </View>
                            
                            <Text style={[styles.dungeonName, { color: colors.textPrimary }]}>
                                {isActive && <Ionicons name="flash" size={18} color={dungeon.color} />} {dungeon.name.toUpperCase()}
                            </Text>
                            <View style={styles.gateInfo}>
                                <Text style={{ color: dungeon.color, fontSize: 10, fontWeight: 'bold' }}>{dungeon.type.toUpperCase()}</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 10 }}> | </Text>
                                <Text style={{ color: profile?.level < dungeon.recommendedLevel ? colors.danger : colors.textSecondary, fontSize: 10 }}>REC. LVL: {dungeon.recommendedLevel}</Text>
                            </View>
                            <Text style={[styles.dungeonDesc, { color: colors.textSecondary }]}>{dungeon.description}</Text>
                            
                            <View style={styles.reqContainer}>
                                <Text style={[styles.reqTitle, { color: colors.textSecondary }]}>BOSS OBJECTIVES:</Text>
                                <View style={styles.tags}>
                                    {dungeon.requirements.map(req => (
                                        <View key={req} style={[styles.tag, { borderColor: colors.border }]}>
                                            <Text style={[styles.tagText, { color: colors.textPrimary }]}>{req}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.rewardContainer}>
                                <View>
                                    <Text style={[styles.rewardText, { color: colors.success }]}>EXP: +{dungeon.xpReward}</Text>
                                    <Text style={{ color: colors.warning, fontSize: 10, fontWeight: 'bold', marginTop: 2 }}>LOOT: {dungeon.loot}</Text>
                                </View>
                                <Text style={[styles.targetText, { color: colors.textSecondary }]}>{dungeon.targetWorkouts} RAIDS REQUIRED</Text>
                            </View>

                            {isActive ? (
                                <View style={styles.progressSection}>
                                    <View style={[styles.progressBar, { backgroundColor: colors.background }]}>
                                        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: dungeon.color }]} />
                                    </View>
                                    <View style={styles.progressLabels}>
                                        <Text style={[styles.progressText, { color: dungeon.color }]}>RAID PROGRESS: {Math.round(progress * 100)}%</Text>
                                        <TouchableOpacity 
                                            style={[styles.abandonBtn, { backgroundColor: '#ff4444' }]} 
                                            onPress={() => startDungeon(null)}
                                        >
                                            <Text style={{ color: '#000', fontSize: 11, fontWeight: 'bold' }}>ABANDON</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    style={[styles.enterBtn, { backgroundColor: dungeon.color }]}
                                    onPress={() => handleEnterDungeon(dungeon)}
                                >
                                    <Text style={styles.enterBtnText}>
                                        {activeDungeon ? 'REPLACE RAID' : 'ENTER GATE'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </FadeInView>
                    );
                })}
                <View style={{ height: 100 }} />
            </ScrollView>

            <Modal visible={showGuide} transparent animationType="fade" onRequestClose={() => setShowGuide(false)}>
                <View style={styles.modalOverlay}>
                    <FadeInView style={[styles.guideContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary }]}>
                        <View style={[styles.guideHeader, { borderBottomColor: colors.border }]}>
                            <Ionicons name="documents-outline" size={24} color={colors.primary} />
                            <Text style={[styles.guideTitle, { color: colors.textPrimary }]}>DUNGEON MANUAL</Text>
                            <TouchableOpacity onPress={() => setShowGuide(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.guideScroll}>
                            <GuideSection title="GATES & RANKS" icon="shield" color={colors.primary}>
                                Gates are instance dungeons (training programs) that require multiple raids to clear. Higher ranks (S, A) denote advanced intensity levels for elite athletes.
                            </GuideSection>
                            <GuideSection title="REC. LEVEL" icon="trending-up" color={colors.warning}>
                                Each gate has a recommended skill level. Entering a high-rank gate as a beginner may lead to overtraining or burnout.
                            </GuideSection>
                            <GuideSection title="LOOT EXTRACTION" icon="cube" color={colors.success}>
                                Clearing a dungeon (program) unlocks unique digital rewards like titles and borders to showcase your consistency and progress.
                            </GuideSection>
                            <GuideSection title="ABANDONING" icon="exit" color={'#ff4444'}>
                                Leaving a program early resets your streak. Commit to the full duration to maximize your physical gains.
                            </GuideSection>
                        </ScrollView>
                        <TouchableOpacity 
                            style={[styles.closeGuideBtn, { backgroundColor: colors.primary }]} 
                            onPress={() => setShowGuide(false)}
                        >
                            <Text style={{ fontWeight: 'bold' }}>I UNDERSTAND</Text>
                        </TouchableOpacity>
                    </FadeInView>
                </View>
            </Modal>
        </View>
    );
}

const GuideSection = ({ title, icon, color, children }) => {
    const { colors } = useTheme();
    return (
        <View style={styles.guideSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 }}>
                <Ionicons name={icon} size={16} color={color} />
                <Text style={[styles.guideSectionTitle, { color }]}>{title}</Text>
            </View>
            <Text style={[styles.guideSectionText, { color: colors.textSecondary }]}>{children}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingBottom: 16, alignItems: 'center', borderBottomWidth: 1 },
    title: { fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
    header: { paddingBottom: 16, paddingHorizontal: 16, alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
    subtitle: { fontSize: 12, paddingHorizontal: 20, marginTop: 20, marginBottom: 10, textAlign: 'center', lineHeight: 18 },
    scroll: { flex: 1 },
    dungeonCard: { marginHorizontal: 16, marginVertical: 10, padding: 20, borderRadius: 16, position: 'relative', overflow: 'hidden' },
    rankLabel: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 12, paddingVertical: 4, borderBottomLeftRadius: 12 },
    rankText: { color: '#000', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    dungeonName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, letterSpacing: 1 },
    gateInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    dungeonDesc: { fontSize: 12, lineHeight: 18, marginBottom: 16 },
    reqContainer: { marginBottom: 16 },
    reqTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    tagText: { fontSize: 10 },
    rewardContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    rewardText: { fontSize: 12, fontWeight: 'bold' },
    targetText: { fontSize: 10 },
    enterBtn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    enterBtnText: { color: '#000', fontWeight: 'bold', letterSpacing: 1 },
    progressSection: { marginTop: 10 },
    progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: '100%', borderRadius: 4 },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    progressText: { fontSize: 11, fontWeight: 'bold', flex: 1 },
    abandonBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, marginLeft: 8 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    guideContent: {
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        borderRadius: 24,
        borderWidth: 1,
        padding: 24,
    },
    guideHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 16,
        borderBottomWidth: 1,
        marginBottom: 16,
    },
    guideTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    guideScroll: {
        marginBottom: 20,
    },
    guideSection: {
        marginBottom: 24,
    },
    guideSectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    guideSectionText: {
        fontSize: 12,
        lineHeight: 18,
    },
    closeGuideBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    normalRaidCard: {
        marginHorizontal: 16,
        marginBottom: 20,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    normalRaidHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    normalRaidTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    normalRaidDesc: {
        fontSize: 11,
        lineHeight: 16,
        marginBottom: 16,
    },
    trainingBtn: {
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
    },
    trainingBtnText: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    divider: {
        height: 1,
        marginHorizontal: 32,
        marginBottom: 20,
        opacity: 0.1,
    }
});
