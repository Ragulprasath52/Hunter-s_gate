import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share, Switch, Platform, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../services/StorageService';
import { getRank, calculateLevelProgress } from '../utils/gameLogic';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { totalHoursTrained, weekOverWeekSummary, bestLiftWithDate } from '../utils/workoutAnalytics';
import FadeInView from '../components/FadeInView';

export default function ProfileScreen() {
    const { colors, isDark, setDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const [profile, setProfile] = useState(null);
    const [workouts, setWorkouts] = useState([]);

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
        }
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
            // Safer fallback for Android/Web where Alert.prompt is not available
            Alert.alert('System Info', 'Profile editing is coming soon to your platform, or set your identity in the system briefing.');
        }
    };

    const handleExport = async () => {
        try {
            const data = await StorageService.exportData();
            await Share.share({ message: data, title: 'Hunter Stats Backup' });
        } catch {
            Alert.alert('ERROR', 'E-Rank performance: Export failed.');
        }
    };

    const handleClearData = () => {
        Alert.alert('SYSTEM RESET', 'This wipes workouts, XP, achievements, and settings on this device.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'RESET',
                style: 'destructive',
                onPress: async () => {
                    await StorageService.clearAllData();
                    await setDarkMode(true);
                    Alert.alert('Reset complete', 'The system has been cleared.');
                    loadData();
                },
            },
        ]);
    };

    if (!profile || !levelInfo) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.primary }}>INITIALIZING HUNTER SYSTEM...</Text>
            </View>
        );
    }

    const rank = getRank(levelInfo.level);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FadeInView duration={400} style={{ flex: 1 }}>
                <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.primary }]}>PROFILE & SETTINGS</Text>
                </View>

            <ScrollView style={styles.content}>
                <FadeInView delay={100} style={[styles.profileCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <TouchableOpacity onPress={handleEditName} style={styles.avatarWrap}>
                        <View style={[styles.avatarPlaceholder, { borderColor: colors.primary, backgroundColor: colors.transparentPrimary }]}>
                            <Text style={[styles.avatarText, { color: colors.primary }]}>{profile.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={[styles.editIcon, { backgroundColor: colors.primary }]}>
                            <Text style={{ color: colors.background, fontSize: 10, fontWeight: 'bold' }}>EDIT</Text>
                        </View>
                    </TouchableOpacity>
                    <Text style={[styles.nameText, { color: colors.textPrimary }]}>{profile.name}</Text>
                    <View style={[styles.rankBadge, { borderColor: colors.success, backgroundColor: colors.transparentSuccess }]}>
                        <Text style={[styles.rankText, { color: colors.success }]}>{rank}</Text>
                    </View>
                    <Text style={[styles.joinDate, { color: colors.textSecondary }]}>
                        Hunter since {new Date(profile.createdDate).toLocaleDateString()}
                    </Text>
                </FadeInView>

                <FadeInView delay={200} style={[styles.infoSection, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <Text style={[styles.infoTitle, { color: colors.primary }]}>PERSONAL RECORDS</Text>
                    <Text style={[styles.pr, { color: colors.textPrimary }]}>
                        Bench: <Text style={{ fontWeight: 'bold', color: colors.primary }}>{bench.weight}</Text> lbs
                        {bench.date ? <Text style={{ color: colors.textSecondary }}> · {new Date(bench.date).toLocaleDateString()}</Text> : null}
                    </Text>
                    <Text style={[styles.pr, { color: colors.textPrimary }]}>
                        Squat: <Text style={{ fontWeight: 'bold', color: colors.success }}>{squat.weight}</Text> lbs
                        {squat.date ? <Text style={{ color: colors.textSecondary }}> · {new Date(squat.date).toLocaleDateString()}</Text> : null}
                    </Text>
                    <Text style={[styles.pr, { color: colors.textPrimary }]}>
                        Deadlift: <Text style={{ fontWeight: 'bold', color: colors.warning }}>{deadlift.weight}</Text> lbs
                        {deadlift.date ? <Text style={{ color: colors.textSecondary }}> · {new Date(deadlift.date).toLocaleDateString()}</Text> : null}
                    </Text>
                </FadeInView>

                <FadeInView delay={300} style={[styles.infoSection, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
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
                    <Row label="Volume (lbs)" value={`${Math.round(wow.thisWeek.volume)} / ${Math.round(wow.lastWeek.volume)}`} colors={colors} />
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
                    <Text style={[styles.infoTitle, { color: colors.primary }]}>APPEARANCE</Text>
                    <View style={styles.rowBetween}>
                        <Text style={{ color: colors.textPrimary, fontSize: 15 }}>Dark mode</Text>
                        <Switch
                            value={isDark}
                            onValueChange={(v) => setDarkMode(v)}
                            trackColor={{ false: colors.border, true: colors.transparentPrimaryMedium }}
                            thumbColor={isDark ? colors.primary : colors.textSecondary}
                        />
                    </View>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>Light mode uses a clean hunter briefing theme.</Text>
                </FadeInView>

                <FadeInView delay={600}>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.primary, backgroundColor: colors.backgroundSecondary }]} onPress={handleExport}>
                        <Text style={[styles.actionBtnText, { color: colors.primary }]}>EXPORT DATA (JSON)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.dangerBtn, { borderColor: '#ff3333' }]} onPress={handleClearData}>
                        <Text style={[styles.dangerBtnText, { color: '#ff3333' }]}>RESET SYSTEM</Text>
                    </TouchableOpacity>

                    <View style={[styles.about, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                        <Text style={[styles.aboutTitle, { color: colors.primary }]}>ABOUT</Text>
                        <Text style={[styles.aboutBody, { color: colors.textSecondary }]}>
                            Solo Leveling Gym Tracker is a local-first training log with XP, ranks, and quests. Data stays on your device via AsyncStorage.
                        </Text>
                        <Text style={[styles.aboutVer, { color: colors.textSecondary }]}>Version 1.0.0</Text>
                    </View>
                </FadeInView>

                <View style={{ height: 100 }} />
            </ScrollView>
            </FadeInView>
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

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingBottom: 16,
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    title: { fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
    content: { flex: 1, padding: SIZES.padding },
    profileCard: {
        alignItems: 'center',
        padding: 20,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        marginBottom: 16,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarWrap: { marginBottom: 10, position: 'relative' },
    editIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
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
    joinDate: { fontSize: 12 },
    infoSection: {
        padding: SIZES.padding,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        marginBottom: 16,
    },
    infoTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 },
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
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    hint: { fontSize: 11, marginTop: 8 },
    actionBtn: {
        borderWidth: 1,
        padding: 16,
        borderRadius: SIZES.radius,
        alignItems: 'center',
        marginBottom: 12,
    },
    actionBtnText: { fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
    dangerBtn: {
        backgroundColor: 'rgba(255, 50, 50, 0.08)',
        borderWidth: 1,
        padding: 16,
        borderRadius: SIZES.radius,
        alignItems: 'center',
        marginBottom: 16,
    },
    dangerBtnText: { fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
    about: { borderWidth: 1, borderRadius: SIZES.radius, padding: SIZES.padding },
    aboutTitle: { fontWeight: 'bold', marginBottom: 8 },
    aboutBody: { fontSize: 13, lineHeight: 20 },
    aboutVer: { marginTop: 10, fontSize: 11 },
});
