import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../services/StorageService';
import { getAchievementProgress } from '../utils/gameLogic';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import AchievementCard from '../components/AchievementCard';
import FadeInView from '../components/FadeInView';

const ICONS = {
    first_workout: '①',
    century_club: '💯',
    week_warrior: '🔥',
    personal_record: '⚡',
    strength_ascension: '🏔️',
    beast_mode: '🐉',
    iron_will: '🛡️',
    champion_level: '👑',
};

export default function AchievementsScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [achievements, setAchievements] = useState([]);
    const [profile, setProfile] = useState(null);
    const [workouts, setWorkouts] = useState([]);

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

    const unlocked = achievements.filter((a) => a.unlocked);
    const locked = achievements.filter((a) => !a.unlocked);
    const unlockedCount = unlocked.length;
    const totalCount = achievements.length;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FadeInView duration={400} style={{ flex: 1 }}>
                <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.primary }]}>ACHIEVEMENTS</Text>
                    <Text style={[styles.subtitle, { color: colors.warning }]}>
                        {unlockedCount} / {totalCount} UNLOCKED
                    </Text>
                </View>

                <ScrollView style={styles.content}>
                    <FadeInView delay={300} style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>UNLOCKED</Text>
                        {unlocked.length === 0 ? (
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Complete quests to populate this hall of fame.</Text>
                        ) : (
                            unlocked.map((ach, idx) => (
                                <FadeInView key={ach.id} delay={400 + idx * 100}>
                                    <AchievementCard
                                        title={ach.name}
                                        description={ach.description}
                                        requirement={ach.requirement}
                                        unlocked
                                        date={ach.date}
                                        icon={ICONS[ach.id] || '★'}
                                    />
                                </FadeInView>
                            ))
                        )}
                    </FadeInView>

                    <FadeInView delay={600} style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>LOCKED</Text>
                        {locked.map((ach, idx) => (
                            <FadeInView key={ach.id} delay={700 + idx * 100}>
                                <AchievementCard
                                    title={ach.name}
                                    description={ach.description}
                                    requirement={ach.requirement}
                                    unlocked={false}
                                    progress={profile ? getAchievementProgress(ach, profile, workouts) : 0}
                                    icon="🔒"
                                />
                            </FadeInView>
                        ))}
                    </FadeInView>
                    <View style={{ height: 48 }} />
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
    title: { fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
    subtitle: { fontSize: 12, marginTop: 6, letterSpacing: 1 },
    content: { flex: 1, padding: SIZES.padding },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 12, letterSpacing: 2 },
    emptyText: { fontStyle: 'italic', textAlign: 'center', marginVertical: 12 },
});
