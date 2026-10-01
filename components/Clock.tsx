"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO-ish date and 24h time, which reads the same in every country. */
function stamp(d: Date): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    ` ${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/** Same width as a real stamp, so the title bar doesn't shift on mount. */
const PLACEHOLDER = "0000-00-00 00:00";

/**
 * The visitor's local date and time, in the title bar.
 *
 * Minutes rather than seconds on purpose: a ticking second would be a
 * second thing moving on a page where the running figure is meant to be
 * the only one.
 */
export default function Clock() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    let timer = 0;

    function tick() {
      setNow(stamp(new Date()));
      // Land on the next minute rather than drifting a little each time.
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    }

    tick();
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <span
      className="hidden text-muted md:inline"
      // The server has no idea what time it is where you are, so both it
      // and the first client render show the placeholder, and the real
      // value arrives on the next paint.
      style={now ? undefined : { visibility: "hidden" }}
    >
      {now ?? PLACEHOLDER}
    </span>
  );
}
