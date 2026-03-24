import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../services/StorageService';
import { getAchievementProgress } from '../utils/gameLogic';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { HUNTER_LEAGUES } from '../constants/achievements';
import FadeInView from '../components/FadeInView';

export default function AchievementsScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [achievements, setAchievements] = useState([]);
    const [profile, setProfile] = useState(null);
    const [workouts, setWorkouts] = useState([]);
    const [expandedLeague, setExpandedLeague] = useState(null);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                const data = await StorageService.loadAllData();
                if (data) {
                    setAchievements(data.achievements);
                    setProfile(data.profile);
                    setWorkouts(data.workouts);
                }
            })();
        }, [])
    );

    const leagueData = useMemo(() => {
        return HUNTER_LEAGUES.map((league) => {
            const leagueAchievements = achievements.filter((a) => a.league === league.rank);
            const unlocked = leagueAchievements.filter((a) => a.unlocked);
            const total = leagueAchievements.length;
            const unlockedCount = unlocked.length;
            const isComplete = total > 0 && unlockedCount === total;
            return { ...league, achievements: leagueAchievements, unlockedCount, total, isComplete };
        });
    }, [achievements]);

    const totalUnlocked = achievements.filter((a) => a.unlocked).length;
    const totalCount = achievements.length;

    const toggleLeague = (rank) => {
        setExpandedLeague(expandedLeague === rank ? null : rank);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FadeInView duration={400} style={{ flex: 1 }}>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {leagueData.map((league, idx) => {
                        const isExpanded = expandedLeague === league.rank;
                        return (
                            <FadeInView key={league.rank} delay={100 + idx * 80}>
                                {/* League Header Card */}
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => toggleLeague(league.rank)}
                                    style={[
                                        styles.leagueCard,
                                        {
                                            backgroundColor: colors.backgroundSecondary,
                                            borderColor: league.isComplete ? league.color : colors.border,
                                            borderLeftWidth: 4,
                                            borderLeftColor: league.color,
                                        },
                                    ]}
                                >
                                    <View style={styles.leagueHeader}>
                                        <View style={styles.leagueLeft}>
                                            <Text style={styles.leagueIcon}>{league.icon}</Text>
                                            <View>
                                                <Text style={[styles.leagueRank, { color: league.color }]}>{league.rank}</Text>
                                                <Text style={[styles.leagueTitle, { color: colors.textPrimary }]}>{league.title}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.leagueRight}>
                                            <View style={[styles.countBadge, { borderColor: league.color, backgroundColor: league.isComplete ? league.color + '30' : 'transparent' }]}>
                                                <Text style={[styles.countText, { color: league.color }]}>
                                                    {league.unlockedCount}/{league.total}
                                                </Text>
                                            </View>
                                            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
                                                {isExpanded ? '▲' : '▼'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Progress Bar */}
                                    <View style={[styles.leagueProgressTrack, { backgroundColor: colors.background }]}>
                                        <View
                                            style={[
                                                styles.leagueProgressFill,
                                                {
                                                    width: league.total > 0 ? `${(league.unlockedCount / league.total) * 100}%` : '0%',
                                                    backgroundColor: league.color,
                                                },
                                            ]}
                                        />
                                    </View>

                                    {!isExpanded && (
                                        <Text style={[styles.leagueDesc, { color: colors.textSecondary }]}>{league.description}</Text>
                                    )}
                                </TouchableOpacity>

                                {/* Expanded Achievement List */}
                                {isExpanded && (
                                    <View style={styles.achievementList}>
                                        {league.achievements.map((ach, achIdx) => {
                                            const prog = profile ? getAchievementProgress(ach, profile, workouts) : 0;
                                            return (
                                                <FadeInView key={ach.id} delay={achIdx * 60} duration={300}>
                                                    <View
                                                        style={[
                                                            styles.achievementCard,
                                                            {
                                                                backgroundColor: ach.unlocked
                                                                    ? league.color + '15'
                                                                    : colors.backgroundSecondary,
                                                                borderColor: ach.unlocked ? league.color : colors.border,
                                                                borderLeftWidth: 3,
                                                                borderLeftColor: ach.unlocked ? league.color : colors.border,
                                                            },
                                                        ]}
                                                    >
                                                        <View style={styles.achHeader}>
                                                            <Text style={[styles.achIcon, { color: ach.unlocked ? league.color : colors.textSecondary }]}>
                                                                {ach.unlocked ? '✦' : '◇'}
                                                            </Text>
                                                            <View style={styles.achContent}>
                                                                <Text style={[styles.achTitle, { color: ach.unlocked ? league.color : colors.textPrimary }]}>
                                                                    {ach.name}
                                                                </Text>
                                                                <Text style={[styles.achDesc, { color: colors.textSecondary }]}>
                                                                    {ach.description}
                                                                </Text>
                                                            </View>
                                                            {ach.unlocked && (
                                                                <Text style={[styles.achCheck, { color: league.color }]}>✓</Text>
                                                            )}
                                                        </View>

                                                        {!ach.unlocked && (
                                                            <View style={styles.achProgressSection}>
                                                                <View style={[styles.achProgressTrack, { backgroundColor: colors.background }]}>
                                                                    <View
                                                                        style={[
                                                                            styles.achProgressFill,
                                                                            {
                                                                                width: `${Math.min(100, Math.round(prog * 100))}%`,
                                                                                backgroundColor: league.color,
                                                                            },
                                                                        ]}
                                                                    />
                                                                </View>
                                                                <Text style={[styles.achProgressText, { color: colors.textSecondary }]}>
                                                                    {Math.round(prog * 100)}%
                                                                </Text>
                                                            </View>
                                                        )}

                                                        {ach.unlocked && ach.date && (
                                                            <Text style={[styles.achDate, { color: league.color }]}>
                                                                Cleared: {new Date(ach.date).toLocaleDateString()}
                                                            </Text>
                                                        )}
                                                    </View>
                                                </FadeInView>
                                            );
                                        })}
                                    </View>
                                )}
                            </FadeInView>
                        );
                    })}
                    <View style={{ height: 60 }} />
                </ScrollView>
            </FadeInView>
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
    subtitle: { fontSize: 12, marginTop: 6, letterSpacing: 1.5 },
    content: { flex: 1, padding: SIZES.padding },

    // League Card
    leagueCard: {
        borderRadius: SIZES.radius,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
    },
    leagueHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    leagueLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    leagueIcon: {
        fontSize: 28,
        marginRight: 12,
    },
    leagueRank: {
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    leagueTitle: {
        fontSize: 11,
        letterSpacing: 1,
        marginTop: 2,
    },
    leagueRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    countBadge: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    countText: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    leagueProgressTrack: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 8,
    },
    leagueProgressFill: {
        height: '100%',
        borderRadius: 2,
    },
    leagueDesc: {
        fontSize: 11,
        fontStyle: 'italic',
        lineHeight: 16,
    },

    // Achievement List
    achievementList: {
        paddingLeft: 8,
        marginBottom: 8,
    },
    achievementCard: {
        borderRadius: SIZES.radius - 2,
        borderWidth: 1,
        padding: 14,
        marginBottom: 8,
    },
    achHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    achIcon: {
        fontSize: 18,
        marginRight: 10,
        marginTop: 2,
    },
    achContent: {
        flex: 1,
    },
    achTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 3,
    },
    achDesc: {
        fontSize: 12,
        lineHeight: 17,
    },
    achCheck: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    achProgressSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingLeft: 28,
    },
    achProgressTrack: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    achProgressFill: {
        height: '100%',
        borderRadius: 3,
    },
    achProgressText: {
        fontSize: 11,
        fontWeight: 'bold',
        marginLeft: 8,
        width: 36,
    },
    achDate: {
        fontSize: 10,
        marginTop: 8,
        paddingLeft: 28,
        letterSpacing: 0.5,
    },
});
