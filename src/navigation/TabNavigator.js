import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

import HomeScreen from '../screens/HomeScreen';
import LogScreen from '../screens/LogScreen';
import ProgressScreen from '../screens/ProgressScreen';
import LeagueScreen from '../screens/LeagueScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    const { colors } = useTheme();
    return (
        <Tab.Navigator
            sceneContainerStyle={{ flex: 1 }}
            screenOptions={({ route }) => ({
                headerShown: false,
                animation: Platform.OS === 'web' ? 'none' : 'fade',
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Log') iconName = focused ? 'add-circle' : 'add-circle-outline';
                    else if (route.name === 'Progress') iconName = focused ? 'analytics' : 'analytics-outline';
                    else if (route.name === 'League') iconName = focused ? 'trophy' : 'trophy-outline';
                    else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';

                    // Special styling for the Log button
                    if (route.name === 'Log' && focused) {
                        return (
                            <View style={[styles.logBtnActive, { backgroundColor: colors.primaryGlow || colors.transparentPrimary }]}>
                                <Ionicons name={iconName} size={size + 2} color={color} />
                            </View>
                        );
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted || colors.textSecondary,
                tabBarStyle: [styles.tabBar, {
                    backgroundColor: colors.backgroundSecondary,
                    borderTopColor: colors.border,
                }],
                tabBarShowLabel: true,
                tabBarLabelStyle: {
                    fontSize: 9,
                    marginBottom: 2,
                    letterSpacing: 1,
                    fontWeight: '600',
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Log" component={LogScreen} />
            <Tab.Screen name="Progress" component={ProgressScreen} />
            <Tab.Screen name="League" component={LeagueScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        borderTopWidth: 1,
        height: 64,
        paddingBottom: 6,
        paddingTop: 6,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    logBtnActive: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
