import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function SystemActionModal({ 
    visible, 
    title, 
    message, 
    confirmText, 
    cancelText, 
    onConfirm, 
    onCancel,
    type = 'SYSTEM' // 'SYSTEM', 'DANGER', 'SUCCESS'
}) {
    const { colors } = useTheme();

    if (!visible) return null;

    const getIcon = () => {
        switch (type) {
            case 'DANGER': return 'alert-circle-outline';
            case 'SUCCESS': return 'checkmark-shield-outline';
            default: return 'flash-outline';
        }
    };

    const getTypeColor = () => {
        switch (type) {
            case 'DANGER': return colors.error || '#ff4444';
            case 'SUCCESS': return colors.success;
            default: return colors.primary;
        }
    };

    const color = getTypeColor();

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
                <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: color }]}>
                    <View style={[styles.glowLineTop, { backgroundColor: color }]} />
                    
                    <View style={styles.iconContainer}>
                        <Ionicons name={getIcon()} size={42} color={color} />
                    </View>

                    <Text style={[styles.title, { color: color }]}>⟨ {title.toUpperCase()} ⟩</Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        {cancelText && (
                            <TouchableOpacity 
                                style={[styles.button, { borderColor: colors.border }]} 
                                onPress={onCancel}
                            >
                                <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                                    {cancelText.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            style={[
                                styles.button, 
                                { 
                                    backgroundColor: color, 
                                    borderColor: color,
                                    shadowColor: color,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 5
                                }
                            ]} 
                            onPress={onConfirm}
                        >
                            <Text style={[styles.buttonText, { color: '#000', fontWeight: 'bold' }]}>
                                {confirmText.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
        borderWidth: 1.5,
        padding: 24,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    glowLineTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
    },
    iconContainer: {
        marginBottom: 20,
        marginTop: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
        letterSpacing: 0.5,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    button: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 13,
        letterSpacing: 1,
    },
});
