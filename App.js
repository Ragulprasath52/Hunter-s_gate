import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NotificationService } from './src/services/NotificationService';
import { View, ActivityIndicator, StyleSheet, StatusBar, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import TabNavigator from './src/navigation/TabNavigator';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { SystemNotificationProvider } from './src/context/SystemNotificationContext';
import SystemAlert from './src/components/SystemAlert';
import { ErrorBoundary } from './src/components/ErrorBoundary';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const id = 'slgt-web-root';
    if (!document.getElementById(id)) {
        const s = document.createElement('style');
        s.id = id;
        s.textContent =
            'html,body{height:100%;margin:0;background:#0a0a0a;}' +
            '#root{min-height:100%;min-height:100vh;display:flex;flex:1;flex-direction:column;}';
        document.head.appendChild(s);
    }
}

// Native screens + flex layout often yields a blank page on web; use JS screens there.
if (Platform.OS === 'web') {
    enableScreens(false);
} else {
    enableScreens(true);
}

function NavigationRoot() {
    const { colors, isDark, ready } = useTheme();

    const navTheme = {
        ...DefaultTheme,
        dark: isDark,
        colors: {
            ...DefaultTheme.colors,
            primary: colors.primary,
            background: colors.background,
            card: colors.backgroundSecondary,
            text: colors.textPrimary,
            border: colors.border,
            notification: colors.success,
        },
    };

    if (!ready) {
        return (
            <View style={[styles.boot, styles.flexFill, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.flexFill}>
            <NavigationContainer theme={navTheme}>
                {Platform.OS !== 'web' ? (
                    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
                ) : null}
                <TabNavigator />
                <SystemAlert />
            </NavigationContainer>
        </View>
    );
}

export default function App() {
    useEffect(() => {
        const initNotifications = async () => {
            const granted = await NotificationService.requestPermissions();
            if (granted) {
                await NotificationService.scheduleDailyQuestReminder();
            }
        };
        initNotifications();
    }, []);

    return (
        <ErrorBoundary>
            <View style={styles.appRoot}>
                <SafeAreaProvider style={styles.flexFill}>
                    <ThemeProvider>
                        <SystemNotificationProvider>
                            <NavigationRoot />
                        </SystemNotificationProvider>
                    </ThemeProvider>
                </SafeAreaProvider>
            </View>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    appRoot: Platform.select({
        web: {
            flex: 1,
            minHeight: '100vh',
            width: '100%',
            alignSelf: 'stretch',
        },
        default: { flex: 1 },
    }),
    flexFill: { flex: 1, alignSelf: 'stretch' },
    boot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
