import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES } from '../constants/theme';

export default function XPBar({ level, progress, currentLevelXP, xpRequired }) {
    const { colors } = useTheme();
    const widthAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        // Smooth spring animation for progress
        Animated.spring(widthAnim, {
            toValue: progress,
            friction: 8,
            tension: 40,
            useNativeDriver: false,
        }).start();

        // Pulsing glow effect
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.timing(glowAnim, {
                    toValue: 0.4,
                    duration: 1500,
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ])
        ).start();
    }, [progress, widthAnim, glowAnim]);

    const barWidth = widthAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.container}>
            <View style={styles.levelRow}>
                <View style={styles.levelBadge}>
                    <Text style={[styles.levelLabel, { color: colors.textPrimary }]}>LVL</Text>
                    <Text style={[styles.levelNum, { color: colors.primary }]}>{level}</Text>
                </View>
                <View style={styles.xpInfo}>
                    <Text style={[styles.xpText, { color: colors.textSecondary }]}>
                        {currentLevelXP} / {xpRequired} XP
                    </Text>
                    <Text style={[styles.xpPercent, { color: colors.primary }]}>
                        {Math.round(progress * 100)}%
                    </Text>
                </View>
            </View>

            {/* Track */}
            <View style={[styles.track, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Animated.View
                    style={[
                        styles.fill,
                        {
                            width: barWidth,
                            backgroundColor: colors.primary,
                        },
                    ]}
                />
                {/* Glow overlay on the fill */}
                <Animated.View
                    style={[
                        styles.fillGlow,
                        {
                            width: barWidth,
                            backgroundColor: colors.primaryGlow || 'rgba(0,212,255,0.3)',
                            opacity: glowAnim,
                        },
                    ]}
                />
            </View>

            <Text style={[styles.nextLevel, { color: colors.textMuted || colors.textSecondary }]}>
                NEXT → LVL {level + 1}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 4,
    },
    levelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    levelLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginRight: 6,
    },
    levelNum: {
        fontSize: 28,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    xpInfo: {
        alignItems: 'flex-end',
    },
    xpText: {
        fontSize: 12,
        letterSpacing: 0.5,
    },
    xpPercent: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 2,
    },
    track: {
        height: 10,
        borderRadius: 5,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    fill: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        borderRadius: 5,
    },
    fillGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        borderRadius: 5,
    },
    nextLevel: {
        fontSize: 9,
        letterSpacing: 2,
        textAlign: 'right',
        marginTop: 6,
    },
});
