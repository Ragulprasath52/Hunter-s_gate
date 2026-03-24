/**
 * Web build: react-native-chart-kit breaks or whitescreens many RN-web apps.
 * Same stats as native, text summaries instead of SVG charts.
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../services/StorageService';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import FadeInView from '../components/FadeInView';
import SystemActionModal from '../components/SystemActionModal';
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
    const [actionModal, setActionModal] = useState({
        visible: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: null,
        onConfirm: () => {},
        type: 'SYSTEM'
    });

    const scanAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(scanAnim, {
                toValue: 1,
                duration: 4000,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const scanTranslateY = scanAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-100, 600],
    });

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
        setActionModal({
            visible: true,
            title: 'BIO-DATA SYNC',
            message: 'Synchronize web command center biometric parameters with the Hunter Registry?',
            confirmText: 'SYNC ✦',
            cancelText: 'ABORT',
            type: 'SYSTEM',
            onConfirm: async () => {
                const next = await StorageService.saveBodyStats({
                    bodyWeight, chest, waist, arms,
                });
                setProfile(next);
                setActionModal(prev => ({ ...prev, visible: false }));
            }
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.primary }]}>
                <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
                <Text style={[styles.title, { color: colors.primary }]}>⟨ SYSTEM STATUS: BIOMETRIC EVALUATION 🌐 ⟩</Text>
                <Text style={[styles.sub, { color: colors.textSecondary }]}>WEB COMMAND CENTER ANALYZING HUNTER POTENTIAL... PHYSICAL GROWTH DETECTED.</Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 48 }}>
                <Text style={[styles.cardTitle, { color: colors.primary }]}>⟨ PHYS: STRENGTH TRENDS ⟩</Text>
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, borderWidth: 1.5 }]}>
                    <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
                    <Animated.View style={[styles.scanLine, { backgroundColor: colors.primary, transform: [{ translateY: scanTranslateY }] }]} />
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

                <Text style={[styles.cardTitle, { color: colors.success }]}>⟨ PHYS: MUSCLE BALANCE ⟩</Text>
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, borderWidth: 1.5 }]}>
                    <View style={[styles.glowLineTop, { backgroundColor: colors.success }]} />
                    <Animated.View style={[styles.scanLine, { backgroundColor: colors.success, transform: [{ translateY: scanTranslateY }] }]} />
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

                <Text style={[styles.cardTitle, { color: colors.primary }]}>⟨ PHYS: WEEKLY VOLUME ⟩</Text>
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, borderWidth: 1.5 }]}>
                    <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
                    <Animated.View style={[styles.scanLine, { backgroundColor: colors.primary, transform: [{ translateY: scanTranslateY }] }]} />
                    {barSummary.map((row) => (
                        <Text key={row.label} style={[styles.rowText, { color: colors.textPrimary }]}>
                            {row.label}: {Math.round(row.vol)} lbs
                        </Text>
                    ))}
                </View>

                <Text style={[styles.cardTitle, { color: colors.warning }]}>⟨ ACHV: PEAK PERFORMANCE ⟩</Text>
                <View style={[styles.card, { borderColor: colors.warning, backgroundColor: colors.backgroundSecondary, borderWidth: 1.5 }]}>
                    <View style={[styles.glowLineTop, { backgroundColor: colors.warning }]} />
                    <Animated.View style={[styles.scanLine, { backgroundColor: colors.warning, transform: [{ translateY: scanTranslateY }] }]} />
                    
                    <View style={styles.prBanner}>
                        <Text style={[styles.prLabel, { color: colors.textSecondary }]}>BENCH PRESS</Text>
                        <View style={styles.prValueRow}>
                            <Text style={[styles.prValue, { color: colors.primary }]}>{bench.weight}</Text>
                            <Text style={[styles.prUnit, { color: colors.textSecondary }]}>KG</Text>
                        </View>
                    </View>

                    <View style={styles.prBanner}>
                        <Text style={[styles.prLabel, { color: colors.textSecondary }]}>SQUAT</Text>
                        <View style={styles.prValueRow}>
                            <Text style={[styles.prValue, { color: colors.success }]}>{squat.weight}</Text>
                            <Text style={[styles.prUnit, { color: colors.textSecondary }]}>KG</Text>
                        </View>
                    </View>

                    <View style={styles.prBanner}>
                        <Text style={[styles.prLabel, { color: colors.textSecondary }]}>DEADLIFT</Text>
                        <View style={styles.prValueRow}>
                            <Text style={[styles.prValue, { color: colors.warning }]}>{deadlift.weight}</Text>
                            <Text style={[styles.prUnit, { color: colors.textSecondary }]}>KG</Text>
                        </View>
                    </View>
                </View>

                <Text style={[styles.cardTitle, { color: colors.primary }]}>⟨ COMP: BATTLE LOG COMPARISON ⟩</Text>
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, borderWidth: 1.5 }]}>
                    <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
                    <Animated.View style={[styles.scanLine, { backgroundColor: colors.primary, transform: [{ translateY: scanTranslateY }] }]} />
                    <View style={styles.compareRow}>
                        <Text style={[styles.compareHead, { color: colors.textSecondary }]}>PARAMETER</Text>
                        <Text style={[styles.compareHead, { color: colors.primary, textAlign: 'center' }]}>CURRENT</Text>
                        <Text style={[styles.compareHead, { color: colors.textSecondary, textAlign: 'right' }]}>PREVIOUS</Text>
                    </View>
                    <View style={styles.compareRow}>
                        <Text style={[styles.compareLabel, { color: colors.textPrimary }]}>VOLUME (KG)</Text>
                        <Text style={[styles.compareVal, { color: colors.primary }]}>{Math.round(months.thisMonth.volume)}</Text>
                        <Text style={[styles.compareVal, { color: colors.textSecondary, textAlign: 'right' }]}>{Math.round(months.lastMonth.volume)}</Text>
                    </View>
                    <View style={styles.compareRow}>
                        <Text style={[styles.compareLabel, { color: colors.textPrimary }]}>RAIDS COMPLETED</Text>
                        <Text style={[styles.compareVal, { color: colors.primary }]}>{months.thisMonth.workouts}</Text>
                        <Text style={[styles.compareVal, { color: colors.textSecondary, textAlign: 'right' }]}>{months.lastMonth.workouts}</Text>
                    </View>
                </View>

                <Text style={[styles.cardTitle, { color: colors.success }]}>⟨ SYS: RAID FREQUENCY MATRIX ⟩</Text>
                <View style={[styles.card, { borderColor: colors.success, backgroundColor: colors.backgroundSecondary, borderWidth: 1.5 }]}>
                    <View style={[styles.glowLineTop, { backgroundColor: colors.success }]} />
                    <Animated.View style={[styles.scanLine, { backgroundColor: colors.success, transform: [{ translateY: scanTranslateY }] }]} />
                    <Text style={[styles.heatLegend, { color: colors.textSecondary, marginBottom: 16 }]}>TEMPORAL SESSION LOG · DARKER = HIGHER INTENSITY</Text>
                    <View style={styles.heatGrid}>
                        {heatmap.grid.map((row, ri) => (
                            <View key={ri} style={styles.heatRow}>
                                {row.map((cell, ci) => {
                                    const c = cell.count;
                                    let bg = colors.heatmapEmpty || 'rgba(255,255,255,0.02)';
                                    if (c === 1) bg = 'rgba(0, 212, 255, 0.2)';
                                    if (c >= 2) bg = 'rgba(0, 212, 255, 0.5)';
                                    if (c >= 4) bg = 'rgba(0, 255, 136, 0.8)';
                                    return <View key={ci} style={[styles.heatCell, { backgroundColor: bg, borderColor: 'rgba(255,255,255,0.05)' }]} />;
                                })}
                            </View>
                        ))}
                    </View>
                </View>

                <Text style={[styles.cardTitle, { color: colors.primary }]}>⟨ SYS: HUNTER REGISTRY (BIOMETRICS) 🌐 ⟩</Text>
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, borderWidth: 1.5 }]}>
                    <View style={[styles.glowLineTop, { backgroundColor: colors.primary }]} />
                    <Animated.View style={[styles.scanLine, { backgroundColor: colors.primary, transform: [{ translateY: scanTranslateY }] }]} />
                    <Field label="Body weight (kg)" value={bodyWeight} onChangeText={setBodyWeight} colors={colors} />
                    <Field label="Chest (in)" value={chest} onChangeText={setChest} colors={colors} />
                    <Field label="Waist (in)" value={waist} onChangeText={setWaist} colors={colors} />
                    <Field label="Arms (in)" value={arms} onChangeText={setArms} colors={colors} />
                    <TouchableOpacity style={[styles.saveBody, { borderColor: colors.success, backgroundColor: colors.transparentSuccess }]} onPress={saveBody}>
                        <Text style={[styles.saveBodyText, { color: colors.success }]}>SYNC BIO-DATA 🌐✦</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <SystemActionModal 
                visible={actionModal.visible}
                title={actionModal.title}
                message={actionModal.message}
                confirmText={actionModal.confirmText}
                cancelText={actionModal.cancelText}
                onConfirm={actionModal.onConfirm}
                onCancel={() => setActionModal(prev => ({ ...prev, visible: false }))}
                type={actionModal.type}
            />
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
        borderWidth: 1.5,
        alignItems: 'center',
    },
    saveBodyText: { fontWeight: 'bold', letterSpacing: 2 },
    glowLineTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
    },
    scanLine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(0, 212, 255, 0.4)',
        zIndex: 10,
        opacity: 0.5,
    },
    prBanner: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.1)'
    },
    prLabel: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5 },
    prValueRow: { flexDirection: 'row', alignItems: 'baseline' },
    prValue: { fontSize: 24, fontWeight: 'bold' },
    prUnit: { fontSize: 10, marginLeft: 4, fontWeight: 'bold' },
});
