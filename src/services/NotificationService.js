import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export const NotificationService = {
    /**
     * Request permissions for notifications.
     */
    async requestPermissions() {
        if (!Device.isDevice) return false;
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') return false;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#00d4ff',
            });
        }
        return true;
    },

    /**
     * Schedule a Daily Quest reminder.
     */
    async scheduleDailyQuestReminder() {
        // Cancel first to avoid duplicates
        await this.cancelAllNotifications();

        // 1. Daily morning briefing (9 AM)
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "⟨ DAILY QUEST HAS ARRIVED ⟩",
                body: "Open the system to initialize today's training. Do not ignore the grind.",
                data: { screen: 'Home' },
                sound: true,
            },
            trigger: {
                hour: 9,
                minute: 0,
                repeats: true,
            },
        });

        // 2. Evening urgency reminder (7 PM)
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "⟨ ! SYSTEM WARNING ! ⟩",
                body: "Daily Quest incomplete. Log a Raid now to avoid potential penalties.",
                data: { screen: 'Log' },
                sound: true,
            },
            trigger: {
                hour: 19,
                minute: 0,
                repeats: true,
            },
        });
    },

    /**
     * Schedule a Penalty Quest warning if inactive for 36 hours.
     * This is intended to be called whenever a workout is saved to reset the timer.
     */
    async resetPenaltyQuestTimer() {
        // Cancel specific penalty triggers if any (for now just clear all)
        // In a real app we'd target specific identifiers
        
        // Schedule penalty warning for 36 hours from now
        await Notifications.scheduleNotificationAsync({
            identifier: 'penalty-warning',
            content: {
                title: "⟨ !! URGENT: PENALTY QUEST !! ⟩",
                body: "36 hours of inactivity detected. The Penalty Zone is opening. Return to training immediately!",
                data: { screen: 'Home' },
                color: '#ff3333',
            },
            trigger: {
                seconds: 36 * 60 * 60, // 36 hours
            },
        });
    },

    async cancelAllNotifications() {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }
};
