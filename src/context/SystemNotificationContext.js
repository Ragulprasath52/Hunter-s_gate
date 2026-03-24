import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';

const SystemNotificationContext = createContext(null);

export function SystemNotificationProvider({ children }) {
    const [alert, setAlert] = useState(null); // { title: string, message: string, type: 'QUEST' | 'LEVEL' | 'SYSTEM' }
    const timeoutRef = useRef(null);

    const showSystemAlert = useCallback((title, message, type = 'SYSTEM') => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        // Trigger haptic feedback for sensory impact
        Haptics.notificationAsync(
            type === 'LEVEL' 
                ? Haptics.NotificationFeedbackType.Success 
                : Haptics.NotificationFeedbackType.Warning
        );

        setAlert({ title, message, type });

        // Auto-hide after 4 seconds
        timeoutRef.current = setTimeout(() => {
            setAlert(null);
        }, 4000);
    }, []);

    const hideAlert = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setAlert(null);
    }, []);

    return (
        <SystemNotificationContext.Provider value={{ showSystemAlert, alert, hideAlert }}>
            {children}
        </SystemNotificationContext.Provider>
    );
}

export function useSystemNotification() {
    const context = useContext(SystemNotificationContext);
    if (!context) {
        throw new Error('useSystemNotification must be used within a SystemNotificationProvider');
    }
    return context;
}
