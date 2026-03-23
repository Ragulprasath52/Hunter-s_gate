import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SIZES } from '../constants/theme';

const { width, height } = Dimensions.get('window');

export default function SuccessOverlay({ visible, onAnimationEnd, message = 'WORKOUT LOGGED' }) {
    const { colors } = useTheme();
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.5)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
                Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: Platform.OS !== 'web' }),
                Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
            ]).start(() => {
                setTimeout(() => {
                    Animated.parallel([
                        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
                        Animated.timing(translateY, { toValue: -20, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
                    ]).start(onAnimationEnd);
                }, 1500);
            });
        }
    }, [visible, opacity, scale, translateY, onAnimationEnd]);

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, { opacity, backgroundColor: 'rgba(0,0,0,0.8)' }]}>
            <Animated.View style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.success, transform: [{ scale }, { translateY }] }]}>
                <View style={[styles.iconCircle, { backgroundColor: colors.transparentSuccess, borderColor: colors.success }]}>
                    <Ionicons name="checkmark-sharp" size={40} color={colors.success} />
                </View>
                <Text style={[styles.title, { color: colors.success }]}>{message}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>SYSTEM SYNC COMPLETE</Text>
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
        width: width * 0.7,
        padding: 30,
        borderRadius: SIZES.radius,
        borderWidth: 2,
        alignItems: 'center',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 2,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 12,
        letterSpacing: 1,
        textAlign: 'center',
    },
});
