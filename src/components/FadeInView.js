import React, { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

/**
 * A reusable wrapper for entrance animations (fade + slight slide up).
 * Re-triggers on focus for a fluid transition feel across tabs.
 */
export default function FadeInView({ children, delay = 0, duration = 500, style }) {
    const isFocused = useIsFocused();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (isFocused) {
            // Reset to start state
            fadeAnim.setValue(0);
            slideAnim.setValue(20);

            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration,
                    delay,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration,
                    delay,
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ]).start();
        }
    }, [isFocused, fadeAnim, slideAnim, delay, duration]);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
}
