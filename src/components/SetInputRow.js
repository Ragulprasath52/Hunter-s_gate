import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function SetInputRow({ 
    setNumber, 
    weight, 
    reps, 
    isCompleted, 
    previousData,
    isBodyweight,
    isTimed,
    duration,
    onUpdateWeight, 
    onUpdateReps, 
    onUpdateDuration,
    onToggleComplete,
    onDelete 
}) {
    const { colors } = useTheme();

    return (
        <View style={[styles.row, isCompleted && { opacity: 0.6 }]}>
            <View style={styles.setNumCol}>
                <Text style={[styles.setText, { color: colors.textSecondary }]}>{setNumber}</Text>
            </View>

            <View style={styles.prevCol}>
                <Text style={[styles.prevText, { color: colors.textSecondary }]}>
                    {previousData || '—'}
                </Text>
            </View>

            {!isTimed && (
                <View style={styles.inputCol}>
                    {isBodyweight ? (
                        <View style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, justifyContent: 'center' }]}>
                            <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 10, fontWeight: 'bold' }}>BW</Text>
                        </View>
                    ) : (
                        <TextInput
                            style={[
                                styles.input, 
                                { 
                                    backgroundColor: colors.background, 
                                    color: colors.primary,
                                    borderColor: isCompleted ? colors.success : colors.border
                                }
                            ]}
                            value={weight}
                            onChangeText={onUpdateWeight}
                            placeholder="0"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="decimal-pad"
                            selectTextOnFocus
                            editable={!isCompleted}
                        />
                    )}
                </View>
            )}

            <View style={styles.inputCol}>
                <TextInput
                    style={[
                        styles.input, 
                        { 
                            backgroundColor: colors.background, 
                            color: colors.primary,
                            borderColor: isCompleted ? colors.success : colors.border
                        }
                    ]}
                    value={isTimed ? duration : reps}
                    onChangeText={isTimed ? onUpdateDuration : onUpdateReps}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    editable={!isCompleted}
                />
            </View>

            <TouchableOpacity 
                style={[
                    styles.checkCol, 
                    { backgroundColor: isCompleted ? colors.success : colors.backgroundSecondary, borderColor: colors.success }
                ]}
                onPress={onToggleComplete}
            >
                {isCompleted ? (
                    <Ionicons name="checkmark" size={16} color="#000" />
                ) : (
                    <View style={styles.checkPlaceholder} />
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteCol} onPress={onDelete}>
                <Ionicons name="trash-outline" size={18} color={colors.error || '#ff4444'} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        gap: 8,
    },
    setNumCol: {
        width: 30,
        alignItems: 'center',
    },
    prevCol: {
        flex: 1.2,
        alignItems: 'center',
    },
    inputCol: {
        flex: 1,
    },
    checkCol: {
        width: 32,
        height: 36,
        borderRadius: 6,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteCol: {
        width: 30,
        alignItems: 'center',
    },
    setText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    prevText: {
        fontSize: 11,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    input: {
        height: 36,
        borderRadius: 4,
        borderWidth: 1,
        textAlign: 'center',
        fontSize: 14,
        fontWeight: 'bold',
        padding: 0,
        paddingVertical: 0,
        ...Platform.select({
            android: {
                includeFontPadding: false,
            }
        })
    },
    checkPlaceholder: {
        width: 14,
        height: 14,
    }
});
