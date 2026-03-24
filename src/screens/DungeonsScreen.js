import React, { useState, useCallback, useMemo } from 'react';
import { useSystemNotification } from '../context/SystemNotificationContext';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, Dimensions, Alert } from 'react-native';
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
        description: 'A basic training facility for awakening hunters. Focus on fundamental movements.',
        requirements: ['Squat', 'Bench Press', 'Deadlift'],
        targetWorkouts: 5,
        xpReward: 500,
        color: '#4ade80',
    },
    {
        id: 'dungeon_intermediate',
        name: 'The Shadow Labyrinth',
        rank: 'C',
        description: 'Test your endurance and strength in the depths of the labyrinth.',
        requirements: ['Squat', 'Overhead Press', 'Pull Up', 'Dips'],
        targetWorkouts: 12,
        xpReward: 2500,
        color: '#3b82f6',
    },
    {
        id: 'dungeon_advanced',
        name: 'Red Gate: Demon Castle',
        rank: 'A',
        description: 'Only high-ranking hunters should attempt this gate. Extreme intensity required.',
        requirements: ['Heavy Deadlift', 'Heavy Squat', 'Weighted Pull Ups'],
        targetWorkouts: 20,
        xpReward: 10000,
        color: '#ef4444',
    }
];

export default function DungeonsScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { showSystemAlert } = useSystemNotification();
    const [activeDungeon, setActiveDungeon] = useState(null);
    const [workouts, setWorkouts] = useState([]);
    const [profile, setProfile] = useState(null);

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
            // In a real app we'd track active dungeon in profile.settings or similar
            // For now let's check a placeholder property
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
            // Immediate UI feedback
            const dungeonId = dungeon ? dungeon.id : null;
            setActiveDungeon(dungeonId);

            const nextProfile = { 
                ...profile, 
                activeDungeon: dungeonId, 
                dungeonStartedAt: dungeon ? new Date().toISOString() : null 
            };
            
            // Background save
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
            // Re-sync with storage
            loadData();
        }
    };

    const getDungeonProgress = (dungeonId) => {
        if (activeDungeon !== dungeonId || !profile?.dungeonStartedAt) return 0;
        const dungeon = DUNGEONS.find(d => d.id === dungeonId);
        if (!dungeon) return 0;

        // Count workouts matching dungeon requirements since start date
        const startDate = new Date(profile.dungeonStartedAt).getTime();
        const relevantWorkouts = workouts.filter(w => 
            new Date(w.date).getTime() >= startDate
        );
        
        return Math.min(1, relevantWorkouts.length / dungeon.targetWorkouts);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.primary }]}>⟨ INSTANCE DUNGEONS ⟩</Text>
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Select a gate to enter. Clearing dungeons grants massive XP and titles.
                </Text>

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
                            
                            <Text style={[styles.dungeonName, { color: colors.textPrimary }]}>{dungeon.name}</Text>
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
                                <Text style={[styles.rewardText, { color: colors.success }]}>REWARD: +{dungeon.xpReward} XP</Text>
                                <Text style={[styles.targetText, { color: colors.textSecondary }]}>{dungeon.targetWorkouts} RAIDS REQUIRED</Text>
                            </View>

                            {isActive ? (
                                <View style={styles.progressSection}>
                                    <View style={[styles.progressBar, { backgroundColor: colors.background }]}>
                                        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: dungeon.color }]} />
                                    </View>
                                    <View style={styles.progressLabels} pointerEvents="box-none">
                                        <Text style={[styles.progressText, { color: dungeon.color }]}>RAID PROGRESS: {Math.round(progress * 100)}%</Text>
                                        <TouchableOpacity 
                                            style={[styles.abandonBtn, { backgroundColor: colors.error || '#ff4444', borderColor: '#ff4444' }]} 
                                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                                            onPress={() => {
                                                console.warn('SYSTEM: Abandon Raid Direct Trigger');
                                                startDungeon(null);
                                            }}
                                        >
                                            <Text style={{ color: '#000', fontSize: 11, fontWeight: 'bold' }}>ABANDON RAID</Text>
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
    title: { fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
    subtitle: {
        fontSize: 12,
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 10,
        textAlign: 'center',
        lineHeight: 18,
    },
    scroll: { flex: 1 },
    dungeonCard: {
        marginHorizontal: 16,
        marginVertical: 10,
        padding: 20,
        borderRadius: 16,
        position: 'relative',
        overflow: 'hidden',
    },
    rankLabel: {
        position: 'absolute',
        top: 0,
        right: 0,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderBottomLeftRadius: 12,
    },
    rankText: {
        color: '#000',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    dungeonName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    dungeonDesc: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 16,
    },
    reqContainer: {
        marginBottom: 16,
    },
    reqTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 1,
    },
    tags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    tagText: {
        fontSize: 10,
    },
    rewardContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    rewardText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    targetText: {
        fontSize: 10,
    },
    enterBtn: {
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    enterBtnText: {
        color: '#000',
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    progressSection: {
        marginTop: 10,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    progressText: {
        fontSize: 11,
        fontWeight: 'bold',
        flex: 1,
    },
    abandonBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 51, 51, 0.3)',
        marginLeft: 8,
        zIndex: 1000,
    }
});
