import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    const [selectedLeague, setSelectedLeague] = useState(null);

    const getRankData = (level) => {
        if (level >= 50) return { rank: 'S', color: '#FFD700', next: 'MAX', xpNeeded: 0 };
        if (level >= 40) return { rank: 'A', color: '#C0C0C0', next: 'S', levelNeeded: 50 };
        if (level >= 25) return { rank: 'B', color: '#CD7F32', next: 'A', levelNeeded: 40 };
        if (level >= 10) return { rank: 'C', color: '#3b82f6', next: 'B', levelNeeded: 25 };
        return { rank: 'E', color: '#4ade80', next: 'C', levelNeeded: 10 };
    };

    const rankInfo = useMemo(() => {
        return profile ? getRankData(profile.level || 1) : null;
    }, [profile]);

    const activeQuests = useMemo(() => {
        if (!workouts.length) return [];
        const totalVol = workouts.reduce((s, w) => s + (Number(w.volume) || 0), 0);
        return [
            { id: 'q1', type: 'Combat', title: 'Strength of the Monarch', goal: '10,000kg Total Volume', progress: Math.min(1, totalVol / 10000), current: totalVol, target: 10000 },
            { id: 'q2', type: 'Endurance', title: 'The Long Road', goal: '50 Total Raids', progress: Math.min(1, workouts.length / 50), current: workouts.length, target: 50 },
        ];
    }, [workouts]);

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
            const leagueAchievements = achievements.filter(
                (a) => a.league === league.rank && (!a.isHidden || a.unlocked)
            );
            const unlocked = leagueAchievements.filter((a) => a.unlocked);
            const total = leagueAchievements.length;
            const unlockedCount = unlocked.length;
            const isComplete = total > 0 && unlockedCount === total;
            const isERank = league.rank === 'E-Rank';
            return { 
                ...league, 
                achievements: leagueAchievements, 
                unlockedCount: isERank ? total : unlockedCount, 
                total, 
                isComplete: isERank ? true : isComplete 
            };
        });
    }, [achievements]);
    const { completedLeagues, upcomingLeagues } = useMemo(() => {
        const completed = leagueData.filter(l => l.isComplete);
        const upcoming = leagueData.filter(l => !l.isComplete);
        return { completedLeagues: completed, upcomingLeagues: upcoming };
    }, [leagueData]);

    const totalUnlocked = achievements.filter((a) => a.unlocked).length;
    const totalCount = achievements.length;

    const toggleLeague = (rank) => {
        setExpandedLeague(expandedLeague === rank ? null : rank);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FadeInView duration={400} style={{ flex: 1 }}>
                <ScrollView 
                    style={{ flex: 1 }} 
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Rank Evolution Section */}
                    <TouchableOpacity 
                        activeOpacity={0.8}
                        onPress={() => setSelectedLeague({ rank: rankInfo?.rank, title: 'CURRENT STANDING', description: `You are currently authorized as an ${rankInfo?.rank}-Rank hunter. Reach Level ${rankInfo?.levelNeeded} to initiate the next evolution protocol.`, color: rankInfo?.color, icon: '🗡️' })}
                        style={[styles.rankEvolutionCard, { backgroundColor: colors.backgroundSecondary, borderColor: rankInfo?.color || colors.primary }]}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <View>
                                <Text style={[styles.evoTitle, { color: colors.textSecondary }]}>RANK EVOLUTION</Text>
                                <Text style={[styles.evoSub, { color: rankInfo?.color }]}>{rankInfo?.rank}-RANK HUNTER</Text>
                            </View>
                            <View style={[styles.rankCircle, { borderColor: rankInfo?.color }]}>
                                <Text style={[styles.rankCircleText, { color: rankInfo?.color }]}>{rankInfo?.rank}</Text>
                            </View>
                        </View>
                        
                        <View style={styles.evoProgressContainer}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={{ fontSize: 10, color: colors.textSecondary }}>TO {rankInfo?.next}-RANK</Text>
                                <Text style={{ fontSize: 10, color: colors.textSecondary }}>LVL {profile?.level || 1} / {rankInfo?.levelNeeded || '??'}</Text>
                            </View>
                            <View style={[styles.evoTrack, { backgroundColor: colors.background }]}>
                                <View style={[styles.evoFill, { 
                                    width: rankInfo?.next === 'MAX' ? '100%' : `${Math.min(100, (profile?.level / rankInfo?.levelNeeded) * 100)}%`, 
                                    backgroundColor: rankInfo?.color 
                                }]} />
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Active Objectives */}
                    <Text style={[styles.sectionHeader, { color: colors.primary }]}>⟨ ACTIVE OBJECTIVES ⟩</Text>
                    {activeQuests.map(quest => (
                        <View key={quest.id} style={[styles.questCard, { backgroundColor: colors.backgroundSecondary, borderLeftColor: colors.accent || colors.primary }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 9, color: colors.accent || colors.primary, fontWeight: 'bold' }}>[{quest.type.toUpperCase()}]</Text>
                                <Text style={[styles.questTitle, { color: colors.textPrimary }]}>{quest.title}</Text>
                                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{quest.goal}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textPrimary }}>{Math.round(quest.progress * 100)}%</Text>
                                <View style={[styles.miniBar, { backgroundColor: colors.background }]}>
                                    <View style={[styles.miniFill, { width: `${quest.progress * 100}%`, backgroundColor: colors.accent || colors.primary }]} />
                                </View>
                            </View>
                        </View>
                    ))}

                    <Text style={[styles.sectionHeader, { color: colors.success, marginTop: 24 }]}>⟨ COMPLETED MILESTONES ⟩</Text>
                    {completedLeagues.map((league, idx) => (
                        <LeagueCard 
                            key={league.rank} 
                            league={league} 
                            idx={idx} 
                            isExpanded={expandedLeague === league.rank}
                            onToggle={() => toggleLeague(league.rank)}
                            onShowInfo={() => setSelectedLeague(league)}
                            profile={profile}
                            workouts={workouts}
                        />
                    ))}

                    <Text style={[styles.sectionHeader, { color: colors.primary, marginTop: 24 }]}>⟨ UPCOMING EVOLUTIONS ⟩</Text>
                    {upcomingLeagues.map((league, idx) => (
                        <LeagueCard 
                            key={league.rank} 
                            league={league} 
                            idx={idx} 
                            isExpanded={expandedLeague === league.rank}
                            onToggle={() => toggleLeague(league.rank)}
                            onShowInfo={() => setSelectedLeague(league)}
                            profile={profile}
                            workouts={workouts}
                        />
                    ))}
                    <View style={{ height: 60 }} />
                </ScrollView>
            </FadeInView>

            {/* Rank Description Modal */}
            <Modal visible={!!selectedLeague} transparent animationType="fade" onRequestClose={() => setSelectedLeague(null)}>
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
                    <FadeInView style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: selectedLeague?.color || colors.primary }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <Text style={{ fontSize: 24 }}>{selectedLeague?.icon}</Text>
                                <View>
                                    <Text style={[styles.modalRank, { color: selectedLeague?.color }]}>{selectedLeague?.rank}-RANK</Text>
                                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{selectedLeague?.title}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedLeague(null)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.modalBody}>
                            <Text style={[styles.modalDesc, { color: colors.textPrimary }]}>{selectedLeague?.description}</Text>
                            
                            <View style={[styles.systemNote, { backgroundColor: (selectedLeague?.color || colors.primary) + '10', borderColor: selectedLeague?.color || colors.primary }]}>
                                <Ionicons name="information-circle-outline" size={20} color={selectedLeague?.color || colors.primary} />
                                <Text style={[styles.systemNoteText, { color: colors.textSecondary }]}>
                                    System status synchronized. Evolutionary path remains active.
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={[styles.modalCloseBtn, { backgroundColor: selectedLeague?.color || colors.primary }]} 
                            onPress={() => setSelectedLeague(null)}
                        >
                            <Text style={styles.modalCloseBtnText}>I UNDERSTAND</Text>
                        </TouchableOpacity>
                    </FadeInView>
                </View>
            </Modal>
        </View>
    );
}

const LeagueCard = ({ league, idx, isExpanded, onToggle, onShowInfo, profile, workouts }) => {
    const { colors } = useTheme();
    return (
        <FadeInView delay={100 + idx * 80}>
            {/* League Header Card */}
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={onToggle}
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
                        <TouchableOpacity style={styles.infoBtn} onPress={onShowInfo}>
                            <Ionicons name="information-circle-outline" size={20} color={league.color} />
                        </TouchableOpacity>
                        <View style={{ marginLeft: 8 }}>
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

            {isExpanded && (
                <View style={styles.achievementList}>
                    {league.achievements.map((ach, achIdx) => {
                        const prog = getAchievementProgress(ach, profile, workouts);
                        return (
                            <FadeInView key={ach.id} delay={achIdx * 60} duration={300}>
                                <View
                                    style={[
                                        styles.achievementCard,
                                        {
                                            backgroundColor: ach.unlocked ? league.color + '15' : colors.backgroundSecondary,
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
                                        {ach.unlocked && <Text style={[styles.achCheck, { color: league.color }]}>✓</Text>}
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
                                </View>
                            </FadeInView>
                        );
                    })}
                </View>
            )}
        </FadeInView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    contentContainer: { padding: 16, paddingBottom: 100 },

    // Rank Evolution
    rankEvolutionCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 20,
        marginBottom: 24,
    },
    evoTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    evoSub: {
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginTop: 4,
    },
    rankCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankCircleText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    evoProgressContainer: {
        marginTop: 10,
    },
    evoTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    evoFill: {
        height: '100%',
    },

    // Quests
    sectionHeader: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 16,
    },
    questCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
    },
    questTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 2,
    },
    miniBar: {
        width: 60,
        height: 4,
        borderRadius: 2,
        marginTop: 4,
        overflow: 'hidden',
    },
    miniFill: {
        height: '100%',
    },

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
    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        borderWidth: 2,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        borderBottomWidth: 1,
        marginBottom: 20,
    },
    modalRank: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    modalBody: {
        marginBottom: 24,
    },
    modalDesc: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 20,
    },
    systemNote: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        gap: 12,
    },
    systemNoteText: {
        fontSize: 11,
        flex: 1,
        lineHeight: 16,
    },
    modalCloseBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalCloseBtnText: {
        color: '#000',
        fontWeight: 'bold',
        letterSpacing: 2,
        fontSize: 14,
    },
    infoBtn: {
        padding: 4,
    }
});
