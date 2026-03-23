import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function XPBar({ progress, currentLevelXP, xpRequired, level }) {
    const { colors } = useTheme();
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(anim, {
            toValue: Math.min(progress, 1),
            useNativeDriver: false, // Cannot use native driver for width
            tension: 20,
            friction: 7,
        }).start();
    }, [progress, anim]);

    const widthInterpolated = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.levelText, { color: colors.success, textShadowColor: colors.success }]}>LEVEL {level}</Text>
                <Text style={[styles.xpText, { color: colors.textSecondary }]}>
                    {Math.floor(currentLevelXP)} / {Math.floor(xpRequired)} XP
                </Text>
            </View>
            <View style={[styles.barBackground, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary }]}>
                <Animated.View style={[styles.barFill, { width: widthInterpolated, backgroundColor: colors.primary }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    levelText: {
        fontSize: 20,
        fontWeight: 'bold',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    xpText: {
        fontSize: 12,
    },
    barBackground: {
        height: 12,
        borderRadius: 6,
        borderWidth: 1,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 6,
    },
});
