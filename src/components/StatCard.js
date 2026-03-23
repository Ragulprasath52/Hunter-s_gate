import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES } from '../constants/theme';

export default function StatCard({ label, value, color }) {
    const { colors } = useTheme();
    const accent = color ?? colors.primary;
    const scale = useRef(new Animated.Value(0.9)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8 }),
            Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
    }, [scale, opacity]);

    return (
        <Animated.View style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: accent, opacity, transform: [{ scale }] }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.value, { color: accent }]}>{value}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        borderWidth: 1,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginHorizontal: 4,
        marginBottom: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '28%',
    },
    label: {
        fontSize: 10,
        marginBottom: 4,
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    value: {
        fontSize: SIZES.fontLarge,
        fontWeight: 'bold',
    },
});
