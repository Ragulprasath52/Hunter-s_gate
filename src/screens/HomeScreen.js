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
        return <View style={[styles.fill, { backgroundColor: colors.background }]} />;
    }

    const { totalWorkouts, totalVolume, pbTotal, hours, progressData } = stats;
    const rank = getRank(progressData.level);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FadeInView duration={400} style={{ flex: 1 }}>
                <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
                    <Text style={[styles.appName, { color: colors.textSecondary }]}>Solo Leveling Gym Tracker</Text>
                    <Text style={[styles.title, { color: colors.primary, textShadowColor: colors.primary }]}>HUNTER STATS SYSTEM</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{profile.name.toUpperCase()}</Text>
                    <View style={[styles.rankPill, { borderColor: colors.success, backgroundColor: colors.transparentSuccess }]}>
                        <Text style={[styles.rankText, { color: colors.success }]}>{rank}</Text>
                    </View>
                </View>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                <FadeInView delay={500} style={[styles.levelSection, { borderColor: colors.primary, backgroundColor: colors.transparentPrimary }]}>
                    <XPBar
                        level={progressData.level}
                        progress={progressData.progress}
                        currentLevelXP={progressData.currentLevelXP}
                        xpRequired={progressData.xpRequiredForNextLevel}
                    />
                </FadeInView>

                <FadeInView delay={600} style={styles.statsContainer}>
                    <View style={styles.statsRow}>
                        <StatCard label="Total Workouts" value={totalWorkouts} />
                        <StatCard label="Current Level" value={progressData.level} />
                        <StatCard label="Current Streak" value={`${profile.streak}d`} color={colors.success} />
                    </View>
                    <View style={styles.statsRow}>
                        <StatCard label="Total Volume" value={`${Math.floor(totalVolume)} lbs`} />
                        <StatCard label="PB (B+S+D)" value={pbTotal} color={colors.warning} />
                        <StatCard label="Hours Trained" value={hours} />
                    </View>
                </FadeInView>

                <FadeInView delay={700}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>QUICK ACTIONS</Text>
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { borderColor: colors.primary, backgroundColor: colors.backgroundSecondary }]}
                            onPress={() => navigation.navigate('Log')}
                        >
                            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                            <Text style={[styles.actionLabel, { color: colors.primary }]}>Log</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { borderColor: colors.primary, backgroundColor: colors.backgroundSecondary }]}
                            onPress={() => navigation.navigate('Progress')}
                        >
                            <Ionicons name="stats-chart-outline" size={22} color={colors.primary} />
                            <Text style={[styles.actionLabel, { color: colors.primary }]}>Progress</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { borderColor: colors.warning, backgroundColor: colors.backgroundSecondary }]}
                            onPress={() => navigation.navigate('Achievements')}
                        >
                            <Ionicons name="trophy-outline" size={22} color={colors.warning} />
                            <Text style={[styles.actionLabel, { color: colors.warning }]}>Quests</Text>
                        </TouchableOpacity>
                    </View>
                </FadeInView>

                <FadeInView delay={800} style={[styles.systemMessage, { borderLeftColor: colors.success, backgroundColor: colors.transparentSuccess }]}>
                    <Text style={[styles.messageText, { color: colors.success }]}>&ldquo;{QUOTES[quoteIndex]}&rdquo;</Text>
                </FadeInView>

                {profile.name.toLowerCase() === 'hunter' && (
                    <FadeInView delay={1000} style={[styles.setupCard, { borderColor: colors.warning, backgroundColor: colors.backgroundSecondary }]}>
                        <Ionicons name="information-circle-outline" size={24} color={colors.warning} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.setupText, { color: colors.textPrimary }]}>The system needs your identity. Set your hunter name in Profile.</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                                <Text style={[styles.setupLink, { color: colors.warning }]}>GO TO PROFILE →</Text>
                            </TouchableOpacity>
                        </View>
                    </FadeInView>
                )}
                <View style={{ height: 100 }} />
            </ScrollView>
            </FadeInView>
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
        fontSize: 11,
        letterSpacing: 1,
        marginBottom: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 2,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    subtitle: {
        fontSize: 12,
        marginTop: 4,
        letterSpacing: 4,
    },
    rankPill: {
        marginTop: 10,
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 14,
        borderWidth: 1,
    },
    rankText: {
        fontWeight: 'bold',
        fontSize: 12,
        letterSpacing: 2,
    },
    content: {
        flex: 1,
        padding: SIZES.padding,
    },
    levelSection: {
        padding: SIZES.padding,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        marginBottom: 20,
    },
    statsContainer: { marginBottom: 12 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    sectionLabel: {
        fontSize: 11,
        letterSpacing: 2,
        marginBottom: 10,
        marginTop: 8,
        fontWeight: 'bold',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    actionBtn: {
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 14,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        alignItems: 'center',
    },
    actionLabel: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: '600',
    },
    systemMessage: {
        padding: SIZES.padding,
        borderLeftWidth: 3,
    },
    messageText: {
        fontStyle: 'italic',
        fontSize: SIZES.fontSmall,
        lineHeight: 20,
    },
    setupCard: {
        marginTop: 20,
        padding: 16,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    setupText: { fontSize: 13, marginBottom: 4 },
    setupLink: { fontSize: 12, fontWeight: 'bold' },
});
