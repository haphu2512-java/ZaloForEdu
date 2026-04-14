import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('app-theme-mode');
    return saved ? saved : 'system'; // Default to system
  });

  const getAutoTheme = useCallback(() => {
    const hour = new Date().getHours();
    return (hour >= 18 || hour < 6) ? 'dark' : 'light';
  }, []);

  const [appliedTheme, setAppliedTheme] = useState('light');

  useEffect(() => {
    localStorage.setItem('app-theme-mode', themeMode);
    
    let targetTheme = themeMode;
    if (themeMode === 'system') {
      targetTheme = getAutoTheme();
    }

    setAppliedTheme(targetTheme);
    document.documentElement.setAttribute('data-theme', targetTheme);

    // If system mode, check every minute for time change
    let interval;
    if (themeMode === 'system') {
      interval = setInterval(() => {
        const newTarget = getAutoTheme();
        if (newTarget !== appliedTheme) {
          setAppliedTheme(newTarget);
          document.documentElement.setAttribute('data-theme', newTarget);
        }
      }, 60000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [themeMode, getAutoTheme, appliedTheme]);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, appliedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
