import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseService } from '../services/FirebaseService';
import { StorageService } from '../services/StorageService';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import FadeInView from '../components/FadeInView';

const { width } = Dimensions.get('window');

export default function LeaderboardScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [leaderboard, setLeaderboard] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedHunter, setSelectedHunter] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        const [data, localData] = await Promise.all([
            FirebaseService.fetchLeaderboard(),
            StorageService.loadAllData()
        ]);
        setLeaderboard(data);
        setCurrentUser(localData.profile);
        setIsLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const getRankColor = (index, total) => {
        if (index === 0) return '#FFD700'; // Gold
        if (index === 1) return '#C0C0C0'; // Silver
        if (index === 2) return '#CD7F32'; // Bronze
        return colors.textSecondary;
    };

    const getRankName = (index) => {
        if (index === 0) return 'S-RANK';
        if (index === 1) return 'A-RANK';
        if (index === 2) return 'B-RANK';
        if (index < 10) return 'C-RANK';
        if (index < 20) return 'D-RANK';
        return 'E-RANK';
    };

    const hunterStats = useMemo(() => {
        if (!selectedHunter || !selectedHunter.workouts) return null;
        
        const workouts = selectedHunter.workouts || [];
        const bestBench = Math.max(0, ...workouts.filter((w) => w.exercise === 'Bench Press').map((w) => Number(w.weight) || 0));
        const bestSquat = Math.max(0, ...workouts.filter((w) => w.exercise === 'Squat').map((w) => Number(w.weight) || 0));
        const bestDeadlift = Math.max(0, ...workouts.filter((w) => w.exercise === 'Deadlift').map((w) => Number(w.weight) || 0));
        
        return {
            bestBench,
            bestSquat,
            bestDeadlift,
            totalWorkouts: workouts.length,
            lastActive: selectedHunter.lastSync ? new Date(selectedHunter.lastSync).toLocaleDateString() : 'Unknown'
        };
    }, [selectedHunter]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FadeInView duration={600} style={{ flex: 1 }}>
                <ScrollView 
                    style={styles.scroll} 
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={colors.primary} />
                    }
                >
                    {leaderboard.length === 0 && !isLoading ? (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No hunters detected in the vicinity...</Text>
                        </View>
                    ) : (
                        leaderboard.map((item, index) => {
                            const isMe = item.id === currentUser?.uid;
                            const rankColor = getRankColor(index, leaderboard.length);
                            
                            return (
                                <FadeInView key={item.id} delay={index * 50} duration={400}>
                                    <TouchableOpacity 
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            setSelectedHunter(item);
                                            setIsModalVisible(true);
                                        }}
                                        style={[
                                            styles.rankCard, 
                                            { 
                                                backgroundColor: colors.backgroundSecondary, 
                                                borderColor: isMe ? colors.primary : colors.border,
                                                borderWidth: isMe ? 2 : 1
                                            }
                                        ]}
                                    >
                                        <View style={styles.rankBadge}>
                                            <Text style={[styles.rankNumber, { color: rankColor }]}>#{index + 1}</Text>
                                            <Text style={[styles.rankLevel, { color: rankColor }]}>{getRankName(index)}</Text>
                                        </View>

                                        <View style={styles.userInfo}>
                                            <Text style={[styles.userName, { color: isMe ? colors.primary : colors.textPrimary }]}>
                                                {item.name || 'Anonymous Hunter'} {isMe ? ' (YOU)' : ''}
                                            </Text>
                                            <Text style={[styles.userStats, { color: colors.textSecondary }]}>
                                                Level {item.level || 1} · {Math.round(item.totalXP || 0)} XP
                                            </Text>
                                        </View>

                                        <View style={styles.streakInfo}>
                                            <Text style={[styles.streakText, { color: colors.warning }]}>
                                                🔥 {item.streak || 0}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </FadeInView>
                            );
                        })
                    )}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </FadeInView>

            {/* Hunter Profile Modal */}
            <Modal
                visible={isModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <TouchableOpacity 
                    activeOpacity={1} 
                    style={styles.modalOverlay} 
                    onPress={() => setIsModalVisible(false)}
                >
                    <TouchableOpacity 
                        activeOpacity={1} 
                        style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary }]}
                        onPress={() => {}}
                    >
                        <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
                        
                        <View style={styles.modalHeader}>
                            <View style={[styles.avatarLarge, { borderColor: colors.primary, backgroundColor: colors.transparentPrimary }]}>
                                <Text style={[styles.avatarText, { color: colors.primary }]}>
                                    {(selectedHunter?.name || 'H').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <Text style={[styles.modalHunterName, { color: colors.textPrimary }]}>
                                {selectedHunter?.name || 'Anonymous Hunter'}
                            </Text>
                            <View style={[styles.modalRankBadge, { borderColor: colors.success, backgroundColor: colors.transparentSuccess }]}>
                                <Text style={[styles.modalRankText, { color: colors.success }]}>
                                    LEVEL {selectedHunter?.level || 1} HUNTER
                                </Text>
                            </View>
                        </View>

                        <View style={styles.modalStatsGrid}>
                            <View style={styles.modalStatItem}>
                                <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>TOTAL XP</Text>
                                <Text style={[styles.modalStatValue, { color: colors.primary }]}>
                                    {Math.round(selectedHunter?.totalXP || 0)}
                                </Text>
                            </View>
                            <View style={styles.modalStatItem}>
                                <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>RAIDS</Text>
                                <Text style={[styles.modalStatValue, { color: colors.textPrimary }]}>
                                    {hunterStats?.totalWorkouts || 0}
                                </Text>
                            </View>
                            <View style={styles.modalStatItem}>
                                <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>STREAK</Text>
                                <Text style={[styles.modalStatValue, { color: colors.warning }]}>
                                    {selectedHunter?.streak || 0}d
                                </Text>
                            </View>
                        </View>

                        <Text style={[styles.modalSectionTitle, { color: colors.primary }]}>⟨ COMBAT RECORDS / PR ⟩</Text>
                        
                        <View style={styles.prContainer}>
                            <View style={[styles.prItem, { borderLeftColor: colors.primary }]}>
                                <Text style={[styles.prLabel, { color: colors.textSecondary }]}>BENCH PRESS</Text>
                                <Text style={[styles.prValue, { color: colors.textPrimary }]}>
                                    {hunterStats?.bestBench || 0} <Text style={styles.unit}>KG</Text>
                                </Text>
                            </View>
                            <View style={[styles.prItem, { borderLeftColor: colors.success }]}>
                                <Text style={[styles.prLabel, { color: colors.textSecondary }]}>SQUAT</Text>
                                <Text style={[styles.prValue, { color: colors.textPrimary }]}>
                                    {hunterStats?.bestSquat || 0} <Text style={styles.unit}>KG</Text>
                                </Text>
                            </View>
                            <View style={[styles.prItem, { borderLeftColor: colors.warning }]}>
                                <Text style={[styles.prLabel, { color: colors.textSecondary }]}>DEADLIFT</Text>
                                <Text style={[styles.prValue, { color: colors.textPrimary }]}>
                                    {hunterStats?.bestDeadlift || 0} <Text style={styles.unit}>KG</Text>
                                </Text>
                            </View>
                        </View>

                        <Text style={[styles.lastSyncText, { color: colors.textMuted || colors.textSecondary }]}>
                            Last System Sync: {hunterStats?.lastActive}
                        </Text>

                        <TouchableOpacity 
                            style={[styles.closeBtn, { backgroundColor: colors.primary }]} 
                            onPress={() => setIsModalVisible(false)}
                        >
                            <Text style={styles.closeBtnText}>CLOSE FILE</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingBottom: 14,
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    title: { fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
    sub: { fontSize: 11, marginTop: 4, letterSpacing: 1 },
    scroll: { flex: 1, padding: 16 },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontStyle: 'italic',
        letterSpacing: 1,
    },
    rankCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    rankBadge: {
        width: 60,
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.1)',
        marginRight: 16,
    },
    rankNumber: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    rankLevel: {
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 2,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    userStats: {
        fontSize: 12,
        marginTop: 4,
    },
    streakInfo: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    streakText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
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
        height: 4,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    modalHunterName: {
        fontSize: 22,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalRankBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    modalRankText: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    modalStatsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    modalStatItem: {
        alignItems: 'center',
        flex: 1,
    },
    modalStatLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 4,
    },
    modalStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalSectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 16,
        textAlign: 'center',
    },
    prContainer: {
        gap: 12,
        marginBottom: 24,
    },
    prItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 8,
        borderLeftWidth: 3,
    },
    prLabel: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    prValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    unit: {
        fontSize: 10,
    },
    lastSyncText: {
        fontSize: 10,
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: 24,
    },
    closeBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    closeBtnText: {
        color: '#000',
        fontWeight: 'bold',
        letterSpacing: 2,
        fontSize: 14,
    },
});
