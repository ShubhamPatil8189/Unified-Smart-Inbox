/**
 * useDarkMode — convenience hook for dark-mode state.
 *
 * Re-exports the values from ThemeContext so components can
 * `import useDarkMode from "../hooks/useDarkMode"` without
 * needing to know about the context directly.
 */
import { useTheme } from "../context/ThemeContext";

export default function useDarkMode() {
  const { darkMode, setDarkMode, toggleDarkMode } = useTheme();
  return { darkMode, setDarkMode, toggleDarkMode };
}
