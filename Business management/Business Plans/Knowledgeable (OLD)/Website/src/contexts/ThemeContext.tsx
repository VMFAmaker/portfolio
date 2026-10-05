
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = "light" | "dark";
type FontSize = "small" | "medium" | "large";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const fontSizeMap: Record<FontSize, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("light");
  const [fontSize, setFontSizeState] = useState<FontSize>("medium");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    const storedFontSize = localStorage.getItem("fontSize") as FontSize | null;

    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      // Set theme based on system preference if no stored theme
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }

    if (storedFontSize) {
      setFontSizeState(storedFontSize);
      // Ensure style is applied only after mount and on client
       document.documentElement.style.setProperty('--font-size-base', fontSizeMap[storedFontSize]);
    } else {
      // Apply default font size if nothing is stored
      document.documentElement.style.setProperty('--font-size-base', fontSizeMap["medium"]);
    }
  }, []);
  
  useEffect(() => {
    if (mounted) {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("theme", theme);
    }
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  }, []);

  const setFontSize = useCallback((size: FontSize) => {
    setFontSizeState(size);
    if (mounted) { // Ensure this runs only on client after mount
      document.documentElement.style.setProperty('--font-size-base', fontSizeMap[size]);
      localStorage.setItem("fontSize", size);
    }
  }, [mounted]);

  if (!mounted) {
    // Return null or a basic loading state to prevent premature rendering of children
    // This helps avoid hydration mismatches.
    // You could return a global loading spinner here if you have one.
    return null; 
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
