import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

/**
 * A reusable wrapper for entrance animations (fade + slight slide up).
 * Re-triggers on every mount for smooth screen transitions.
 * Uses a key-based approach that works on both web and native.
 */
export default function FadeInView({ children, delay = 0, duration = 450, style }) {
    const isFocused = useIsFocused();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(32)).current;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;

    useEffect(() => {
        if (!isFocused) {
            fadeAnim.setValue(0);
            slideAnim.setValue(32);
            scaleAnim.setValue(0.92);
            return;
        }

        const runAnimation = () => {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration,
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ]).start();
        };

        if (delay > 0) {
            const timer = setTimeout(runAnimation, delay);
            return () => clearTimeout(timer);
        } else {
            runAnimation();
        }
    }, [isFocused]);

    // Use a key that changes with focus to ensure the component 
    // and its animations are fully initialized when coming into view.
    return (
        <Animated.View
            key={isFocused ? 'visible' : 'hidden'}
            style={[
                style,
                {
                    opacity: fadeAnim,
                    transform: [
                        { translateY: slideAnim },
                        { scale: scaleAnim }
                    ],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
}
