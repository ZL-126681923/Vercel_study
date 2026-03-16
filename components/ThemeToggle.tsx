"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-full bg-stone-800/50 dark:bg-stone-800/50 light:bg-stone-200/50 hover:bg-stone-700/50 dark:hover:bg-stone-700/50 light:hover:bg-stone-300/50 transition-all duration-300 flex items-center justify-center group"
      aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
    >
      {/* Sun icon */}
      <svg
        className={`w-5 h-5 absolute transition-all duration-300 ${
          theme === "dark"
            ? "opacity-100 rotate-0 scale-100 text-amber-400"
            : "opacity-0 -rotate-90 scale-0 text-amber-400"
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>

      {/* Moon icon */}
      <svg
        className={`w-5 h-5 absolute transition-all duration-300 ${
          theme === "light"
            ? "opacity-100 rotate-0 scale-100 text-stone-600"
            : "opacity-0 rotate-90 scale-0 text-stone-600"
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    </button>
  );
}
