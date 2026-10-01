"use client";

import { useEffect, useState } from "react";
import { litPath, moon, type Moon } from "@/lib/moon";
import ThemeToggle from "./ThemeToggle";

/**
 * A line of ambient metadata across the top of the page: where this was
 * made, and what the moon is doing about it.
 *
 * It sits on the background layer, behind the terminal, and is quiet
 * enough to read as part of the page rather than as content.
 */

const LOCATION = "JAKARTA, ID";
const COORDS = "6°10′S 106°49′E";

function MoonIcon({ phase }: { phase: number }) {
  return (
    <svg viewBox="-6 -6 12 12" width="11" height="11" aria-hidden="true" className="shrink-0">
      <circle r={5} fill="none" stroke="currentColor" strokeOpacity={0.4} strokeWidth={0.8} />
      <path d={litPath(phase, 5)} fill="currentColor" />
    </svg>
  );
}

export default function PageMeta() {
  const [sky, setSky] = useState<Moon | null>(null);

  useEffect(() => {
    setSky(moon());
    // The phase moves about 1.7% an hour, so hourly is plenty.
    const timer = window.setInterval(() => setSky(moon()), 3_600_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="page-meta">
      <span className="flex items-center gap-4 sm:gap-6">
        <span className="text-ink">{LOCATION}</span>
        <span className="hidden sm:inline">{COORDS}</span>
      </span>

      <span className="flex items-center gap-4">
        <span
          className="inline-flex items-center gap-1.5"
          // The page is prerendered, so the moon can only be worked out once
          // there's a real clock to ask. Holds its width until then.
          style={sky ? undefined : { visibility: "hidden" }}
        >
          <MoonIcon phase={sky?.phase ?? 0.25} />
          {sky ? `${sky.name} ${Math.round(sky.illumination * 100)}%` : "waxing crescent 00%"}
        </span>

        <span aria-hidden="true" className="h-4 w-px bg-line" />

        {/* One toggle for the whole desktop, rather than one per window.
            The bar ignores clicks, so this has to opt back in. */}
        <span className="pointer-events-auto">
          <ThemeToggle />
        </span>
      </span>
    </div>
  );
}
