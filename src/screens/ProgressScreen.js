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

    const [isLoading, setIsLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                // If we don't have workouts, show loading state.
                // If we already do, just refresh data in background.
                if (workouts.length === 0) {
                    setIsLoading(true);
                }
                const data = await StorageService.loadAllData();
                if (data) {
                    setWorkouts(data.workouts);
                    setProfile(data.profile);
                    const b = data.profile?.bodyStats || {};
                    setBodyWeight(b.bodyWeight ?? '');
                    setChest(b.chest ?? '');
                    setWaist(b.waist ?? '');
                    setArms(b.arms ?? '');
                }
                setTimeout(() => setIsLoading(false), 350);
            })();
        }, [])
    );

    const chartConfig = useMemo(
        () => ({
            backgroundGradientFrom: colors.backgroundSecondary,
            backgroundGradientTo: colors.backgroundSecondary,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 212, 255, ${opacity})`,
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
            <FadeInView duration={600} style={{ flex: 1 }}>
                <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.primary }]}>⟨ ANALYTICS ⟩</Text>
                    <Text style={[styles.sub, { color: colors.textSecondary }]}>Strength trends · balance · density</Text>
                </View>

                {isLoading && workouts.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: colors.primary, letterSpacing: 4, fontSize: 13, fontWeight: 'bold' }}>⟨ SYNCING SYSTEM DATA... ⟩</Text>
                    </View>
                ) : (
                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
                        <FadeInView delay={100} duration={500}>
                            <Text style={[styles.sectionTitle, { color: colors.primary }]}>⟨ STRENGTH TRENDS ⟩</Text>
                            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                                <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
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
                        </FadeInView>

                    <FadeInView delay={200}>
                        <Text style={[styles.sectionTitle, { color: colors.accent || colors.primary }]}>⟨ MUSCLE BALANCE ⟩</Text>
                        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                            <View style={[styles.glowLineTop, { backgroundColor: colors.accent || colors.primary }]} />
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
                    </FadeInView>

                    <FadeInView delay={300}>
                        <Text style={[styles.sectionTitle, { color: colors.primary }]}>⟨ WEEKLY VOLUME ⟩</Text>
                        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                            <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
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
                    </FadeInView>

                    <FadeInView delay={400}>
                        <Text style={[styles.sectionTitle, { color: colors.warning }]}>⟨ PERSONAL BESTS ⟩</Text>
                        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                            <View style={[styles.glowLineTop, { backgroundColor: colors.warning }]} />
                            <Text style={[styles.prLine, { color: colors.textPrimary }]}>
                                Bench: <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{bench.weight}</Text> kg
                                {bench.date ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}> · {new Date(bench.date).toLocaleDateString()}</Text> : null}
                            </Text>
                            <Text style={[styles.prLine, { color: colors.textPrimary }]}>
                                Squat: <Text style={{ color: colors.success, fontWeight: 'bold' }}>{squat.weight}</Text> kg
                                {squat.date ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}> · {new Date(squat.date).toLocaleDateString()}</Text> : null}
                            </Text>
                            <Text style={[styles.prLine, { color: colors.textPrimary }]}>
                                Deadlift: <Text style={{ color: colors.warning, fontWeight: 'bold' }}>{deadlift.weight}</Text> kg
                                {deadlift.date ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}> · {new Date(deadlift.date).toLocaleDateString()}</Text> : null}
                            </Text>
                        </View>
                    </FadeInView>

                    <FadeInView delay={500}>
                        <Text style={[styles.sectionTitle, { color: colors.primary }]}>⟨ MONTHLY PERFORMANCE ⟩</Text>
                        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                            <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
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
                    </FadeInView>

                    <FadeInView delay={600}>
                        <Text style={[styles.sectionTitle, { color: colors.success }]}>⟨ ACTIVITY MATRIX ⟩</Text>
                        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                            <View style={[styles.glowLineTop, { backgroundColor: colors.success }]} />
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
                    </FadeInView>

                    <FadeInView delay={700}>
                        <Text style={[styles.sectionTitle, { color: colors.primary }]}>⟨ BIOMETRIC DATA ⟩</Text>
                        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                            <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
                            <Field label="Body weight (kg)" value={bodyWeight} onChangeText={setBodyWeight} colors={colors} />
                            <Field label="Chest (in)" value={chest} onChangeText={setChest} colors={colors} />
                            <Field label="Waist (in)" value={waist} onChangeText={setWaist} colors={colors} />
                            <Field label="Arms (in)" value={arms} onChangeText={setArms} colors={colors} />
                            <TouchableOpacity 
                                style={[styles.saveBody, { borderColor: colors.success, backgroundColor: colors.transparentSuccess }]} 
                                activeOpacity={0.8}
                                onPress={() => saveBody()}
                            >
                                <Text style={[styles.saveBodyText, { color: colors.success }]}>SYNC BIO-DATA ✦</Text>
                            </TouchableOpacity>
                        </View>
                    </FadeInView>
                    <View style={{ height: 48 }} />
                </ScrollView>
                )}
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
    sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 14, letterSpacing: 2, marginTop: 12 },
    card: {
        borderRadius: SIZES.radiusLg || 12,
        borderWidth: 1,
        padding: 16,
        marginBottom: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    glowLineTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
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
