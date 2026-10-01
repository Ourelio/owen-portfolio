"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/**
 * Small text toggle, not a switch. Defaults to whatever the system
 * prefers and remembers a manual override from then on.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  // The inline script in layout.tsx has already set data-theme by the time
  // this runs, so read from there rather than guessing again.
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private browsing, blocked storage. The toggle still works for now.
    }
    setTheme(next);
  }

  const target: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to the ${target} theme`}
      className="text-muted hover:text-accent"
      // Holds its place in the layout until the theme is known.
      style={theme ? undefined : { visibility: "hidden" }}
    >
      <span aria-hidden="true">{target === "dark" ? "☾" : "☀"}</span>{" "}
      {target}
    </button>
  );
}
