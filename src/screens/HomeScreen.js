import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StorageService } from '../services/StorageService';
import { calculateLevelProgress, getRank } from '../utils/gameLogic';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import XPBar from '../components/XPBar';
import StatCard from '../components/StatCard';
import FadeInView from '../components/FadeInView';
import { totalHoursTrained } from '../utils/workoutAnalytics';

const QUOTES = [
    'The system has acknowledged your presence. Keep training to unlock higher ranks.',
    'Every rep is a step closer to the next level. Do not waste the grind.',
    'Strength is not given. It is earned in silence, set after set.',
    'Your stats are updating. Consistency is the ultimate skill.',
    'Rest is part of the quest. Return sharper tomorrow.',
    'I alone level up. The dungeon awaits.',
    'Arise. Your shadow army grows stronger with each session.',
    'The weak fear the dungeon. You conquer it daily.',
];

export default function HomeScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const [profile, setProfile] = useState(null);
    const [workouts, setWorkouts] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [quoteIndex, setQuoteIndex] = useState(0);

    const loadData = async () => {
        const data = await StorageService.loadAllData();
        if (data) {
            setProfile(data.profile);
            setWorkouts(data.workouts);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
            setQuoteIndex(Math.floor(Math.random() * QUOTES.length));
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const stats = useMemo(() => {
        if (!profile) return null;
        const totalWorkouts = workouts.length;
        const totalVolume = workouts.reduce((sum, w) => sum + (Number(w.volume) || 0), 0);
        const bestBench = Math.max(0, ...workouts.filter((w) => w.exercise === 'Bench Press').map((w) => Number(w.weight) || 0));
        const bestSquat = Math.max(0, ...workouts.filter((w) => w.exercise === 'Squat').map((w) => Number(w.weight) || 0));
        const bestDeadlift = Math.max(0, ...workouts.filter((w) => w.exercise === 'Deadlift').map((w) => Number(w.weight) || 0));
        const pbTotal = bestBench + bestSquat + bestDeadlift;
        const hours = totalHoursTrained(workouts).toFixed(1);
        const progressData = calculateLevelProgress(profile.totalXP);
        return { totalWorkouts, totalVolume, pbTotal, hours, progressData };
    }, [profile, workouts]);

    if (!profile || !stats) {
        return (
            <View style={[styles.fill, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.primary, letterSpacing: 3, fontSize: 12 }}>LOADING SYSTEM...</Text>
            </View>
        );
    }

    const { totalWorkouts, totalVolume, pbTotal, hours, progressData } = stats;
    const rank = getRank(progressData.level);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FadeInView duration={400} style={{ flex: 1 }}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
                    <Text style={[styles.appName, { color: colors.textMuted || colors.textSecondary }]}>HUNTER'S GATE</Text>
                    <Text style={[styles.title, { color: colors.primary }]}>
                        ⟨ SYSTEM INTERFACE ⟩
                    </Text>
                    <Text style={[styles.hunterName, { color: colors.textPrimary }]}>{profile.name.toUpperCase()}</Text>
                    <View style={[
                        styles.rankBadge, 
                        { 
                            borderColor: rank === 'S-Rank' ? '#a33fe3' : colors.success, 
                            backgroundColor: rank === 'S-Rank' ? 'rgba(163, 63, 227, 0.15)' : (colors.successGlow || colors.transparentSuccess) 
                        }
                    ]}>
                        <Text style={[styles.rankText, { color: rank === 'S-Rank' ? '#a33fe3' : colors.success }]}>
                            ⬥ {rank === 'S-Rank' ? 'SHADOW SOVEREIGN' : rank} ⬥
                        </Text>
                    </View>
                </View>

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                >
                    {/* XP Section */}
                    <FadeInView delay={150}>
                        <View style={[styles.xpSection, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                            <XPBar
                                level={progressData.level}
                                progress={progressData.progress}
                                currentLevelXP={progressData.currentLevelXP}
                                xpRequired={progressData.xpRequiredForNextLevel}
                            />
                        </View>
                    </FadeInView>

                    {/* Stats Grid */}
                    <FadeInView delay={250}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>HUNTER STATS</Text>
                        <View style={styles.statsRow}>
                            <StatCard label="Raids" value={totalWorkouts} icon="⚔️" />
                            <StatCard label="Level" value={progressData.level} color={colors.accent} icon="✦" />
                            <StatCard label="Streak" value={`${profile.streak}d`} color={colors.success} icon="🔥" />
                        </View>
                        <View style={styles.statsRow}>
                            <StatCard label="Volume" value={`${Math.floor(totalVolume)}`} icon="💪" />
                            <StatCard label="Big 3 Total" value={pbTotal} color={colors.warning} icon="🏆" />
                            <StatCard label="Hours" value={hours} icon="⏱️" />
                        </View>
                    </FadeInView>

                    {/* Daily Quests / Penalty Quest */}
                    <FadeInView delay={350}>
                        {(() => {
                            const lastDate = profile.lastWorkoutDate ? new Date(profile.lastWorkoutDate) : null;
                            const isPenalty = lastDate && (new Date() - lastDate > 36 * 60 * 60 * 1000); // Over 36 hours since last raid
                            
                            if (isPenalty) {
                                return (
                                    <>
                                        <Text style={[styles.sectionLabel, { color: '#ff3333' }]}>⟨ ! PENALTY QUEST ACTIVE ! ⟩</Text>
                                        <View style={[styles.questCard, { borderColor: '#ff3333', backgroundColor: 'rgba(255, 51, 51, 0.1)' }]}>
                                            <View style={[styles.glowLineTop, { backgroundColor: '#ff3333' }]} />
                                            <Text style={{ color: '#ff3333', fontWeight: 'bold', fontSize: 13, marginBottom: 4, letterSpacing: 1 }}>任务: SURVIVE THE VOID</Text>
                                            <Text style={{ color: colors.textPrimary, fontSize: 12, marginBottom: 16 }}>You have neglected your training. The system has transported you to the penalty zone.</Text>
                                            <QuestItem 
                                                title="EMERGENCY EXIT" 
                                                desc="Log any Raid to escape the penalty" 
                                                done={false} 
                                                colors={colors} 
                                            />
                                            <View style={[styles.questStatus, { backgroundColor: 'rgba(255, 51, 51, 0.2)' }]}>
                                                <Text style={{ color: '#ff3333', fontWeight: 'bold', fontSize: 10 }}>PENALTY ZONE ACTIVE: RETURN IMMEDIATELY</Text>
                                            </View>
                                        </View>
                                    </>
                                );
                            }

                            const todayStr = new Date().toDateString();
                            const workToday = workouts.filter(w => new Date(w.date).toDateString() === todayStr);
                            const volToday = workToday.reduce((s, w) => s + (Number(w.volume) || 0), 0);
                            
                            const q1 = workToday.length > 0;
                            const q2 = volToday >= 2500;
                            const q3 = (profile.streak || 0) >= 3;
                            const allDone = q1 && q2 && q3;

                            return (
                                <>
                                    <Text style={[styles.sectionLabel, { color: colors.primary }]}>⟨ DAILY QUESTS ⟩</Text>
                                    <View style={[styles.questCard, { borderColor: allDone ? colors.success : colors.warning, backgroundColor: colors.backgroundSecondary }]}>
                                        <View style={[styles.glowLineTop, { backgroundColor: allDone ? colors.success : colors.warning }]} />
                                        <QuestItem 
                                            title="THE GRIND: INITIALIZE" 
                                            desc="Log at least 1 training session today" 
                                            done={q1} 
                                            colors={colors} 
                                        />
                                        <QuestItem 
                                            title="LIMIT BREAK: VOLUME" 
                                            desc="Reach 2,500kg total volume today" 
                                            done={q2} 
                                            colors={colors} 
                                        />
                                        <QuestItem 
                                            title="IRON WILL: STREAK" 
                                            desc="Maintain a 3+ day training streak" 
                                            done={q3} 
                                            colors={colors} 
                                        />
                                        
                                        <View style={[styles.questStatus, { backgroundColor: colors.background }]}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>DAILY SYSTEM EVALUATION: </Text>
                                            <Text style={{ color: allDone ? colors.success : colors.warning, fontWeight: 'bold' }}>
                                                {allDone ? 'CLEARED' : 'IN PROGRESS'}
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            );
                        })()}
                    </FadeInView>

                    {/* Quick Actions */}
                    <FadeInView delay={450}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>QUICK ACTIONS</Text>
                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                style={[styles.actionBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary }]}
                                onPress={() => navigation.navigate('Log')}
                            >
                                <Ionicons name="add-circle" size={24} color={colors.primary} />
                                <Text style={[styles.actionLabel, { color: colors.primary }]}>LOG RAID</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                style={[styles.actionBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.accent || colors.primary }]}
                                onPress={() => navigation.navigate('Progress')}
                            >
                                <Ionicons name="analytics" size={24} color={colors.accent || colors.primary} />
                                <Text style={[styles.actionLabel, { color: colors.accent || colors.primary }]}>ANALYTICS</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                style={[styles.actionBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.warning }]}
                                onPress={() => navigation.navigate('League')}
                            >
                                <Ionicons name="trophy" size={24} color={colors.warning} />
                                <Text style={[styles.actionLabel, { color: colors.warning }]}>LEAGUE</Text>
                            </TouchableOpacity>
                        </View>
                    </FadeInView>

                    {/* System Message */}
                    <FadeInView delay={550}>
                        <View style={[styles.systemMessage, { borderLeftColor: colors.accent || colors.primary, backgroundColor: colors.transparentAccent || colors.transparentPrimary }]}>
                            <Text style={[styles.systemLabel, { color: colors.accent || colors.primary }]}>⌁ SYSTEM MESSAGE</Text>
                            <Text style={[styles.messageText, { color: colors.textSecondary }]}>"{QUOTES[quoteIndex]}"</Text>
                        </View>
                    </FadeInView>

                    {/* Identity prompt */}
                    {profile.name.toLowerCase() === 'hunter' && (
                        <FadeInView delay={550}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => navigation.navigate('Profile')}
                                style={[styles.identityCard, { borderColor: colors.warning, backgroundColor: colors.warningGlow || colors.transparentWarning || 'rgba(255,215,0,0.05)' }]}
                            >
                                <Ionicons name="alert-circle" size={20} color={colors.warning} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.identityTitle, { color: colors.warning }]}>IDENTITY NOT SET</Text>
                                    <Text style={[styles.identityDesc, { color: colors.textSecondary }]}>Register your hunter name in Profile →</Text>
                                </View>
                            </TouchableOpacity>
                        </FadeInView>
                    )}
                    <View style={{ height: 80 }} />
                </ScrollView>
            </FadeInView>
        </View>
    );
}

function QuestItem({ title, desc, done, colors }) {
    return (
        <View style={styles.questItem}>
            <View style={styles.questIconFixed}>
                <Ionicons 
                    name={done ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={done ? colors.success : colors.textMuted || colors.border} 
                />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.questTitle, { color: done ? colors.success : colors.textPrimary }]}>
                    {title}
                </Text>
                <Text style={[styles.questDesc, { color: colors.textSecondary }]}>{desc}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1 },
    container: { flex: 1 },
    header: {
        paddingBottom: 16,
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    appName: {
        fontSize: 9,
        letterSpacing: 4,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 3,
        marginBottom: 6,
    },
    hunterName: {
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 4,
        marginBottom: 10,
    },
    rankBadge: {
        paddingHorizontal: 18,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
    },
    rankText: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    content: {
        flex: 1,
        padding: SIZES.padding,
    },
    xpSection: {
        padding: SIZES.padding,
        borderRadius: SIZES.radiusLg || SIZES.radius,
        borderWidth: 1,
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 3,
        marginBottom: 10,
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    questCard: {
        padding: SIZES.padding,
        borderRadius: SIZES.radius,
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
    questItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    questIconFixed: {
        width: 32,
        paddingTop: 2,
    },
    questTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    questDesc: {
        fontSize: 10,
        marginTop: 2,
    },
    questStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        padding: 8,
        borderRadius: 4,
    },
    actionsRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    actionBtn: {
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 16,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginTop: 6,
    },
    systemMessage: {
        borderLeftWidth: 3,
        borderRadius: SIZES.radiusSm || 8,
        padding: SIZES.padding,
        marginBottom: 16,
    },
    systemLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 8,
    },
    messageText: {
        fontSize: 13,
        lineHeight: 20,
        fontStyle: 'italic',
    },
    identityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SIZES.padding,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        marginBottom: 16,
    },
    identityTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    identityDesc: {
        fontSize: 12,
        marginTop: 3,
    },
});
