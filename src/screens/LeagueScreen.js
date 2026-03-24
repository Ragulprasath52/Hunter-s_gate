import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import LeaderboardScreen from './LeaderboardScreen';
import AchievementsScreen from './AchievementsScreen';
import FadeInView from '../components/FadeInView';

export default function LeagueScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState('global'); // 'global' or 'quests'

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.tabContainer, { paddingTop: insets.top + 8, backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
                <View style={[styles.tabBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <TouchableOpacity 
                        style={[
                            styles.tab, 
                            activeTab === 'global' && { backgroundColor: colors.primaryGlow || colors.transparentPrimary }
                        ]} 
                        onPress={() => setActiveTab('global')}
                    >
                        <Text style={[
                            styles.tabText, 
                            { color: activeTab === 'global' ? colors.primary : colors.textSecondary }
                        ]}>GLOBAL RANKING</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[
                            styles.tab, 
                            activeTab === 'quests' && { backgroundColor: colors.primaryGlow || colors.transparentPrimary }
                        ]} 
                        onPress={() => setActiveTab('quests')}
                    >
                        <Text style={[
                            styles.tabText, 
                            { color: activeTab === 'quests' ? colors.primary : colors.textSecondary }
                        ]}>MY QUESTS</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ flex: 1 }}>
                {activeTab === 'global' ? <LeaderboardScreen /> : <AchievementsScreen />}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    tabContainer: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    tabBar: {
        flexDirection: 'row',
        borderRadius: 12,
        borderWidth: 1,
        padding: 4,
        marginTop: 8,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    tabText: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
});
