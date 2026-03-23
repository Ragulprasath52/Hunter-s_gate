import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

import HomeScreen from '../screens/HomeScreen';
import LogScreen from '../screens/LogScreen';
import ProgressScreen from '../screens/ProgressScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    const { colors } = useTheme();
    return (
        <Tab.Navigator
            lazy
            sceneContainerStyle={{ flex: 1 }}
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Log') iconName = focused ? 'add-circle' : 'add-circle-outline';
                    else if (route.name === 'Progress') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                    else if (route.name === 'Achievements') iconName = focused ? 'trophy' : 'trophy-outline';
                    else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarStyle: [styles.tabBar, { backgroundColor: colors.backgroundSecondary, borderTopColor: colors.border }],
                tabBarShowLabel: true,
                tabBarLabelStyle: { fontSize: 10, marginBottom: 2 },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Log" component={LogScreen} />
            <Tab.Screen name="Progress" component={ProgressScreen} />
            <Tab.Screen name="Achievements" component={AchievementsScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        borderTopWidth: 1,
        height: 62,
        paddingBottom: 6,
        paddingTop: 6,
    },
});
