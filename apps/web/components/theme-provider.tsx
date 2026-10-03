"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type * as React from "react";

// next-themes stores the choice in localStorage (`theme` key), applies it before first paint (no flash)
// and follows the system theme until the user picks one explicitly.
export function ThemeProvider({
	children,
	...props
}: React.ComponentProps<typeof NextThemesProvider>) {
	return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

/** Light/dark toggle based on the theme currently applied (the system one included). */
export function useThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	return {
		isDark,
		toggle: () => setTheme(isDark ? "light" : "dark"),
	};
}
