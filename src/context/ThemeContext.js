import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/StorageService';
import { DARK_COLORS, LIGHT_COLORS } from '../constants/theme';

const ThemeContext = createContext({
    isDark: true,
    colors: DARK_COLORS,
    toggleTheme: () => { },
    setDarkMode: () => { },
    ready: false,
});

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(true);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const data = await StorageService.loadAllData();
            if (!cancelled && data?.settings?.theme === 'light') {
                setIsDark(false);
            }
            setReady(true);
        })();
        return () => { cancelled = true; };
    }, []);

    const setDarkMode = useCallback(async (dark) => {
        setIsDark(dark);
        const data = await StorageService.loadAllData();
        const settings = { ...(data?.settings || {}), theme: dark ? 'dark' : 'light' };
        await StorageService.saveSettings(settings);
    }, []);

    const toggleTheme = useCallback(() => {
        const next = !isDark;
        setIsDark(next);
        StorageService.loadAllData().then((data) => {
            const settings = { ...(data?.settings || {}), theme: next ? 'dark' : 'light' };
            return StorageService.saveSettings(settings);
        });
    }, [isDark]);

    const colors = useMemo(() => (isDark ? DARK_COLORS : LIGHT_COLORS), [isDark]);

    const value = useMemo(
        () => ({ isDark, colors, toggleTheme, setDarkMode, ready }),
        [isDark, colors, toggleTheme, setDarkMode, ready]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    return useContext(ThemeContext);
}
