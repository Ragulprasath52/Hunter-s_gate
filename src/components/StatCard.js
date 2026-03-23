import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableWithoutFeedback, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES } from '../constants/theme';

export default function StatCard({ label, value, color, icon }) {
    const { colors } = useTheme();
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const accentColor = color || colors.primary;

    const onPressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.94,
            friction: 5,
            useNativeDriver: Platform.OS !== 'web',
        }).start();
    };

    const onPressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            useNativeDriver: Platform.OS !== 'web',
        }).start();
    };

    return (
        <TouchableWithoutFeedback onPressIn={onPressIn} onPressOut={onPressOut}>
            <Animated.View
                style={[
                    styles.card,
                    {
                        backgroundColor: colors.cardBg || colors.backgroundSecondary,
                        borderColor: colors.border,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                {/* Glow accent line at top */}
                <View style={[styles.glowLine, { backgroundColor: accentColor }]} />

                {icon && <Text style={[styles.icon, { color: accentColor }]}>{icon}</Text>}

                <Text
                    style={[styles.value, { color: accentColor }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                >
                    {value}
                </Text>
                <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
                    {label}
                </Text>
            </Animated.View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        marginHorizontal: 4,
        marginVertical: 4,
        padding: 14,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        minHeight: 85,
    },
    glowLine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        borderTopLeftRadius: SIZES.radius,
        borderTopRightRadius: SIZES.radius,
    },
    icon: {
        fontSize: 20,
        marginBottom: 6,
    },
    value: {
        fontSize: 22,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 4,
    },
    label: {
        fontSize: SIZES.fontXs || 10,
        letterSpacing: 0.8,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
});
