import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SIZES } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function SuccessOverlay({ visible, onAnimationEnd, message = 'RAID COMPLETE' }) {
    const { colors } = useTheme();
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.3)).current;
    const translateY = useRef(new Animated.Value(30)).current;
    const iconScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Reset
            opacity.setValue(0);
            scale.setValue(0.3);
            translateY.setValue(30);
            iconScale.setValue(0);

            // Card entrance
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
                Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: Platform.OS !== 'web' }),
                Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
            ]).start(() => {
                // Icon pop
                Animated.spring(iconScale, { toValue: 1, friction: 3, tension: 100, useNativeDriver: Platform.OS !== 'web' }).start();

                // Auto-dismiss
                setTimeout(() => {
                    Animated.parallel([
                        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
                        Animated.timing(translateY, { toValue: -30, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
                    ]).start(onAnimationEnd);
                }, 1800);
            });
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, { opacity, backgroundColor: 'rgba(5,5,16,0.9)' }]}>
            <Animated.View style={[styles.card, {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.success,
                transform: [{ scale }, { translateY }],
            }]}>
                {/* Glow line */}
                <View style={[styles.glowLine, { backgroundColor: colors.success }]} />

                <Animated.View style={[styles.iconCircle, {
                    backgroundColor: colors.successGlow || colors.transparentSuccess,
                    borderColor: colors.success,
                    transform: [{ scale: iconScale }],
                }]}>
                    <Ionicons name="checkmark-sharp" size={44} color={colors.success} />
                </Animated.View>

                <Text style={[styles.title, { color: colors.success }]}>{message}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>✦ XP SYNCED TO SYSTEM ✦</Text>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    card: {
        width: Math.min(width * 0.75, 320),
        padding: 32,
        borderRadius: SIZES.radiusLg || 16,
        borderWidth: 2,
        alignItems: 'center',
        overflow: 'hidden',
    },
    glowLine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
    },
    iconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 3,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 11,
        letterSpacing: 2,
        textAlign: 'center',
    },
});
