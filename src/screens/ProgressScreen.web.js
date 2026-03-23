/**
 * Web build: react-native-chart-kit breaks or whitescreens many RN-web apps.
 * Same stats as native, text summaries instead of SVG charts.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../services/StorageService';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import {
    weeklyVolumeSeries,
    bigThreeMaxByWeek,
    muscleVolumeTotals,
    buildHeatmapGrid,
    monthStats,
    bestLiftWithDate,
} from '../utils/workoutAnalytics';

export default function ProgressScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [workouts, setWorkouts] = useState([]);
    const [, setProfile] = useState(null);
    const [bodyWeight, setBodyWeight] = useState('');
    const [chest, setChest] = useState('');
    const [waist, setWaist] = useState('');
    const [arms, setArms] = useState('');

    useFocusEffect(
        useCallback(() => {
            (async () => {
                const data = await StorageService.loadAllData();
                if (data) {
                    setWorkouts(data.workouts);
                    setProfile(data.profile);
                    const b = data.profile.bodyStats || {};
                    setBodyWeight(b.bodyWeight ?? '');
                    setChest(b.chest ?? '');
                    setWaist(b.waist ?? '');
                    setArms(b.arms ?? '');
                }
            })();
        }, [])
    );

    const lineSummary = useMemo(() => {
        const { labels, bench, squat, deadlift } = bigThreeMaxByWeek(workouts, 10);
        return labels.map((lb, i) => ({
            label: lb,
            bench: bench[i],
            squat: squat[i],
            deadlift: deadlift[i],
        }));
    }, [workouts]);

    const barSummary = useMemo(() => {
        const { labels, values } = weeklyVolumeSeries(workouts, 8);
        return labels.map((lb, i) => ({ label: lb, vol: values[i] }));
    }, [workouts]);

    const radarLabels = ['Chest', 'Back', 'Legs', 'Arms', 'Shoulders'];
    const radarRaw = useMemo(() => muscleVolumeTotals(workouts), [workouts]);
    const radarPairs = useMemo(
        () => radarLabels.map((name, i) => ({ name, vol: radarRaw[i] || 0 })),
        [radarRaw]
    );

    const heatmap = useMemo(() => buildHeatmapGrid(workouts, 12), [workouts]);
    const months = useMemo(() => monthStats(workouts), [workouts]);

    const bench = bestLiftWithDate(workouts, 'Bench Press');
    const squat = bestLiftWithDate(workouts, 'Squat');
    const deadlift = bestLiftWithDate(workouts, 'Deadlift');

    const saveBody = async () => {
        const next = await StorageService.saveBodyStats({
            bodyWeight,
            chest,
            waist,
            arms,
        });
        setProfile(next);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.primary }]}>PROGRESS & ANALYTICS</Text>
                <Text style={[styles.sub, { color: colors.textSecondary }]}>Web view · charts are text summaries (use the mobile app for graphs).</Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 48 }}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Strength (max lbs / week)</Text>
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                    {workouts.length === 0 ? (
                        <Text style={[styles.empty, { color: colors.textSecondary }]}>Log workouts to see trends.</Text>
                    ) : (
                        lineSummary.map((row) => (
                            <Text key={row.label} style={[styles.rowText, { color: colors.textPrimary }]}>
                                {row.label}: bench {row.bench} · squat {row.squat} · DL {row.deadlift}
                            </Text>
                        ))
                    )}
                </View>

                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Muscle volume (lbs)</Text>
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                    {workouts.length === 0 ? (
                        <Text style={[styles.empty, { color: colors.textSecondary }]}>No data yet.</Text>
                    ) : (
                        radarPairs.map((p) => (
                            <Text key={p.name} style={[styles.rowText, { color: colors.textPrimary }]}>
                                {p.name}: {Math.round(p.vol)} lbs
                            </Text>
                        ))
                    )}
                </View>

                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Weekly volume (lbs)</Text>
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                    {barSummary.map((row) => (
                        <Text key={row.label} style={[styles.rowText, { color: colors.textPrimary }]}>
                            {row.label}: {Math.round(row.vol)} lbs
                        </Text>
                    ))}
                </View>

                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Personal bests</Text>
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.prLine, { color: colors.textPrimary }]}>
                        Bench: <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{bench.weight}</Text> lbs
                        {bench.date ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}> · {new Date(bench.date).toLocaleDateString()}</Text> : null}
                    </Text>
                    <Text style={[styles.prLine, { color: colors.textPrimary }]}>
                        Squat: <Text style={{ color: colors.success, fontWeight: 'bold' }}>{squat.weight}</Text> lbs
                        {squat.date ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}> · {new Date(squat.date).toLocaleDateString()}</Text> : null}
                    </Text>
                    <Text style={[styles.prLine, { color: colors.textPrimary }]}>
                        Deadlift: <Text style={{ color: colors.warning, fontWeight: 'bold' }}>{deadlift.weight}</Text> lbs
                        {deadlift.date ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}> · {new Date(deadlift.date).toLocaleDateString()}</Text> : null}
                    </Text>
                </View>

                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Monthly comparison</Text>
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                    <View style={styles.compareRow}>
                        <Text style={[styles.compareHead, { color: colors.textSecondary }]} />
                        <Text style={[styles.compareHead, { color: colors.primary }]}>This month</Text>
                        <Text style={[styles.compareHead, { color: colors.textSecondary }]}>Last month</Text>
                    </View>
                    <View style={styles.compareRow}>
                        <Text style={[styles.compareLabel, { color: colors.textPrimary }]}>Volume</Text>
                        <Text style={[styles.compareVal, { color: colors.textPrimary }]}>{Math.round(months.thisMonth.volume)}</Text>
                        <Text style={[styles.compareVal, { color: colors.textSecondary }]}>{Math.round(months.lastMonth.volume)}</Text>
                    </View>
                    <View style={styles.compareRow}>
                        <Text style={[styles.compareLabel, { color: colors.textPrimary }]}>Workouts</Text>
                        <Text style={[styles.compareVal, { color: colors.textPrimary }]}>{months.thisMonth.workouts}</Text>
                        <Text style={[styles.compareVal, { color: colors.textSecondary }]}>{months.lastMonth.workouts}</Text>
                    </View>
                </View>

                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Workout heatmap</Text>
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.heatLegend, { color: colors.textSecondary }]}>Last 12 weeks · darker = more sessions</Text>
                    <View style={styles.heatGrid}>
                        {heatmap.grid.map((row, ri) => (
                            <View key={ri} style={styles.heatRow}>
                                {row.map((cell, ci) => {
                                    const c = cell.count;
                                    let bg = colors.heatmapEmpty;
                                    if (c === 1) bg = colors.transparentPrimaryMedium;
                                    if (c >= 2) bg = colors.transparentPrimary;
                                    if (c >= 4) bg = 'rgba(0, 255, 136, 0.35)';
                                    return <View key={ci} style={[styles.heatCell, { backgroundColor: bg, borderColor: colors.border }]} />;
                                })}
                            </View>
                        ))}
                    </View>
                </View>

                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Body stats (optional)</Text>
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                    <Field label="Body weight (lbs)" value={bodyWeight} onChangeText={setBodyWeight} colors={colors} />
                    <Field label="Chest (in)" value={chest} onChangeText={setChest} colors={colors} />
                    <Field label="Waist (in)" value={waist} onChangeText={setWaist} colors={colors} />
                    <Field label="Arms (in)" value={arms} onChangeText={setArms} colors={colors} />
                    <TouchableOpacity style={[styles.saveBody, { borderColor: colors.success, backgroundColor: colors.transparentSuccess }]} onPress={saveBody}>
                        <Text style={[styles.saveBodyText, { color: colors.success }]}>SAVE BODY STATS</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

function Field({ label, value, onChangeText, colors }) {
    return (
        <View style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={colors.textSecondary}
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: SIZES.radius,
                    padding: 12,
                    color: colors.textPrimary,
                    backgroundColor: colors.background,
                }}
            />
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
    title: { fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
    sub: { fontSize: 11, marginTop: 6, paddingHorizontal: 20, textAlign: 'center' },
    scroll: { flex: 1, padding: SIZES.padding },
    cardTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, marginTop: 8 },
    card: {
        borderRadius: SIZES.radius,
        borderWidth: 1,
        padding: 12,
        marginBottom: 12,
        overflow: 'hidden',
    },
    empty: { textAlign: 'center', padding: 24, fontStyle: 'italic' },
    rowText: { fontSize: 13, marginBottom: 6 },
    prLine: { fontSize: 15, marginBottom: 8 },
    compareRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    compareHead: { flex: 1, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
    compareLabel: { flex: 1, fontSize: 13 },
    compareVal: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'center' },
    heatLegend: { fontSize: 11, marginBottom: 8 },
    heatGrid: { alignSelf: 'center' },
    heatRow: { flexDirection: 'row' },
    heatCell: {
        width: 10,
        height: 10,
        margin: 2,
        borderRadius: 2,
        borderWidth: StyleSheet.hairlineWidth,
    },
    saveBody: {
        marginTop: 8,
        padding: 14,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        alignItems: 'center',
    },
    saveBodyText: { fontWeight: 'bold', letterSpacing: 1 },
});
