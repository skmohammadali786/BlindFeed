import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ColorScheme, DarkColors, LightColors } from "@/constants/colors";

const DARK_MODE_KEY = "bf_dark_mode";

interface ThemeContextType {
  isDark: boolean;
  colors: ColorScheme;
  setDark: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  colors: DarkColors,
  setDark: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(DARK_MODE_KEY).then((val) => {
      if (val !== null) setIsDark(val === "true");
    });
  }, []);

  const setDark = useCallback((val: boolean) => {
    setIsDark(val);
    AsyncStorage.setItem(DARK_MODE_KEY, String(val));
  }, []);

  const colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
