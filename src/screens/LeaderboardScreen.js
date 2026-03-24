import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { FirebaseService } from '../services/FirebaseService';
import { StorageService } from '../services/StorageService';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import FadeInView from '../components/FadeInView';

export default function LeaderboardScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [leaderboard, setLeaderboard] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

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
                                    <View style={[
                                        styles.rankCard, 
                                        { 
                                            backgroundColor: colors.backgroundSecondary, 
                                            borderColor: isMe ? colors.primary : colors.border,
                                            borderWidth: isMe ? 2 : 1
                                        }
                                    ]}>
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
                                    </View>
                                </FadeInView>
                            );
                        })
                    )}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </FadeInView>
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
});
