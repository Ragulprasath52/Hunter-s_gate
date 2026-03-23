import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TextInput, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart, BarChart, RadarChart } from 'react-native-chart-kit';
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
import FadeInView from '../components/FadeInView';

const screenW = Dimensions.get('window').width;

export default function ProgressScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [workouts, setWorkouts] = useState([]);
    const [profile, setProfile] = useState(null);
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

    const chartConfig = useMemo(
        () => ({
            backgroundGradientFrom: colors.backgroundSecondary,
            backgroundGradientTo: colors.backgroundSecondary,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(74, 158, 255, ${opacity})`,
            labelColor: () => colors.textSecondary,
            propsForBackgroundLines: { stroke: colors.chartGrid },
        }),
        [colors]
    );

    const lineData = useMemo(() => {
        const { labels, bench, squat, deadlift } = bigThreeMaxByWeek(workouts, 10);
        return {
            labels,
            datasets: [
                { data: bench, color: () => colors.primary, strokeWidth: 2 },
                { data: squat, color: () => colors.success, strokeWidth: 2 },
                { data: deadlift, color: () => colors.warning, strokeWidth: 2 },
            ],
            legend: ['Bench', 'Squat', 'Deadlift'],
        };
    }, [workouts, colors]);

    const barData = useMemo(() => {
        const { labels, values } = weeklyVolumeSeries(workouts, 8);
        return { labels, datasets: [{ data: values }] };
    }, [workouts]);

    const radarData = useMemo(() => {
        const raw = muscleVolumeTotals(workouts);
        const max = Math.max(1, ...raw);
        const norm = raw.map((v) => Math.round((v / max) * 100));
        return {
            labels: ['Chest', 'Back', 'Legs', 'Arms', 'Shoulders'],
            data: norm,
        };
    }, [workouts]);

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

    const chartWidth = Math.min(screenW - SIZES.padding * 2, screenW - 32);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FadeInView duration={400} style={{ flex: 1 }}>
                <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.primary }]}>PROGRESS TRACKER</Text>
                    <Text style={[styles.sub, { color: colors.textSecondary }]}>Strength trends, balance, and training density</Text>
                </View>

                <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 48 }}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Strength progress (max weight / week)</Text>
                    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                        {workouts.length === 0 ? (
                            <Text style={[styles.empty, { color: colors.textSecondary }]}>Log workouts to see trends.</Text>
                        ) : (
                            <LineChart
                                data={lineData}
                                width={chartWidth}
                                height={220}
                                chartConfig={chartConfig}
                                bezier
                                style={styles.chart}
                                withShadow={false}
                                withInnerLines
                                withOuterLines
                                fromZero
                            />
                        )}
                    </View>

                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Muscle group balance (volume)</Text>
                    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                        {workouts.length === 0 ? (
                            <Text style={[styles.empty, { color: colors.textSecondary }]}>No data yet.</Text>
                        ) : (
                            <RadarChart
                                data={{
                                    labels: radarData.labels,
                                    datasets: [{ data: radarData.data }],
                                }}
                                width={chartWidth}
                                height={240}
                                chartConfig={{
                                    ...chartConfig,
                                    color: (opacity = 1) => `rgba(0, 255, 136, ${opacity})`,
                                }}
                                style={styles.chart}
                            />
                        )}
                    </View>

                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Weekly volume (lbs)</Text>
                    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                        <BarChart
                            data={barData}
                            width={chartWidth}
                            height={220}
                            chartConfig={chartConfig}
                            style={styles.chart}
                            fromZero
                            showValuesOnTopOfBars
                            yAxisLabel=""
                            yAxisSuffix=""
                        />
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
                    <View style={{ height: 48 }} />
                </ScrollView>
            </FadeInView>
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
    chart: { marginVertical: 8, borderRadius: SIZES.radius },
    empty: { textAlign: 'center', padding: 24, fontStyle: 'italic' },
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
