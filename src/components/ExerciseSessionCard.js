import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import SetInputRow from './SetInputRow';

export default function ExerciseSessionCard({ 
    exercise, 
    onAddSet, 
    onDeleteSet, 
    onUpdateSet, 
    onToggleSetComplete,
    onRemoveExercise,
    historyData,
    isBodyweight
}) {
    const { colors } = useTheme();

    return (
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: colors.primary }]}>{exercise.name}</Text>
                    <TouchableOpacity onPress={onRemoveExercise} style={styles.removeBtn}>
                        <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {exercise.sets.length} SETS TOTAL
                </Text>
            </View>

            <View style={styles.tableHeader}>
                <View style={styles.setNumCol}><Text style={[styles.headerText, { color: colors.textSecondary }]}>SET</Text></View>
                <View style={styles.prevCol}><Text style={[styles.headerText, { color: colors.textSecondary }]}>PREV</Text></View>
                <View style={styles.inputCol}><Text style={[styles.headerText, { color: colors.textSecondary }]}>KG</Text></View>
                <View style={styles.inputCol}><Text style={[styles.headerText, { color: colors.textSecondary }]}>REPS</Text></View>
                <View style={styles.checkCol}></View>
                <View style={styles.deleteCol}></View>
            </View>

            {exercise.sets.map((set, index) => (
                <SetInputRow
                    key={set.id}
                    setNumber={index + 1}
                    weight={set.weight}
                    reps={set.reps}
                    isCompleted={set.isCompleted}
                    isBodyweight={isBodyweight}
                    previousData={historyData?.[index]}
                    onUpdateWeight={(val) => onUpdateSet(set.id, 'weight', val)}
                    onUpdateReps={(val) => onUpdateSet(set.id, 'reps', val)}
                    onToggleComplete={() => onToggleSetComplete(set.id)}
                    onDelete={() => onDeleteSet(set.id)}
                />
            ))}

            <TouchableOpacity 
                style={[styles.addSetBtn, { backgroundColor: colors.background }]} 
                onPress={onAddSet}
            >
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={[styles.addSetText, { color: colors.primary }]}>ADD SET</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
        padding: 16,
        overflow: 'hidden',
    },
    header: {
        marginBottom: 12,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 2,
    },
    removeBtn: {
        padding: 4,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        marginBottom: 4,
        gap: 8,
    },
    setNumCol: { width: 30, alignItems: 'center' },
    prevCol: { flex: 1.2, alignItems: 'center' },
    inputCol: { flex: 1, alignItems: 'center' },
    checkCol: { width: 32 },
    deleteCol: { width: 30 },
    headerText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    addSetBtn: {
        marginTop: 12,
        paddingVertical: 8,
        borderRadius: 6,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    addSetText: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1,
    }
});
