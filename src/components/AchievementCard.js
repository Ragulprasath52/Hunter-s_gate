import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES } from '../constants/theme';

export default function AchievementCard({ title, description, requirement, unlocked, date, progress = 0, icon = '★' }) {
    const { colors } = useTheme();
    return (
        <View
            style={[
                styles.card,
                unlocked
                    ? { backgroundColor: colors.transparentSuccess, borderColor: colors.success }
                    : { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, opacity: 0.85 },
            ]}
        >
            <View style={styles.badge}>
                <Text style={[styles.badgeText, { color: unlocked ? colors.warning : colors.textSecondary }]}>{icon}</Text>
            </View>
            <View style={styles.content}>
                <Text style={[styles.title, { color: unlocked ? colors.primary : colors.textSecondary }]}>{title}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
                {!unlocked && requirement ? (
                    <Text style={[styles.req, { color: colors.textSecondary }]}>Requirement: {requirement}</Text>
                ) : null}
                {!unlocked ? (
                    <View style={[styles.progressTrack, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${Math.min(100, Math.round(progress * 100))}%`, backgroundColor: colors.primary },
                            ]}
                        />
                    </View>
                ) : null}
                {unlocked && date ? (
                    <Text style={[styles.date, { color: colors.success }]}>Unlocked: {new Date(date).toLocaleDateString()}</Text>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        padding: SIZES.padding,
        marginBottom: 12,
        borderRadius: SIZES.radius,
        borderWidth: 1,
    },
    badge: {
        width: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    badgeText: {
        fontSize: 28,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: SIZES.fontMedium,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    description: {
        fontSize: SIZES.fontSmall,
        marginBottom: 6,
    },
    req: {
        fontSize: 11,
        marginBottom: 8,
        fontStyle: 'italic',
    },
    progressTrack: {
        height: 8,
        borderRadius: 4,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        marginTop: 4,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    date: {
        fontSize: 10,
        marginTop: 8,
    },
});
