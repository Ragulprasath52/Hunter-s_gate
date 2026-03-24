import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { useSystemNotification } from '../context/SystemNotificationContext';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function SystemAlert() {
    const { alert, hideAlert } = useSystemNotification();
    const { colors } = useTheme();
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (alert) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 20,
                    useNativeDriver: true,
                    tension: 40,
                    friction: 7
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -100,
                    duration: 300,
                    useNativeDriver: true
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true
                })
            ]).start();
        }
    }, [alert]);

    if (!alert) return null;

    const getTypeColor = () => {
        switch (alert.type) {
            case 'LEVEL': return colors.primary;
            case 'QUEST': return colors.success;
            case 'SYSTEM': 
            default: return colors.accent || colors.primary;
        }
    };

    const typeColor = getTypeColor();

    return (
        <Animated.View 
            style={[
                styles.container, 
                { 
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: typeColor,
                    shadowColor: typeColor
                }
            ]}
        >
            <TouchableOpacity activeOpacity={0.9} onPress={hideAlert} style={styles.content}>
                <View style={[styles.glowLine, { backgroundColor: typeColor }]} />
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: typeColor }]}>
                        ⟨ {alert.title.toUpperCase()} ⟩
                    </Text>
                    <Text style={[styles.message, { color: colors.textPrimary }]}>
                        {alert.message}
                    </Text>
                </View>
                <View style={[styles.accent, { borderColor: typeColor }]} />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 20,
        right: 20,
        borderRadius: 4,
        borderWidth: 1,
        borderLeftWidth: 4,
        zIndex: 10000,
        elevation: 10,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    content: {
        padding: 16,
        paddingLeft: 20,
        position: 'relative',
        overflow: 'hidden',
    },
    glowLine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        opacity: 0.8,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 4,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    accent: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        width: 20,
        height: 20,
        borderWidth: 1,
        transform: [{ rotate: '45deg' }],
        opacity: 0.3,
    }
});
