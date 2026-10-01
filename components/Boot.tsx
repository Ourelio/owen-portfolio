"use client";

import { useEffect, useRef, useState } from "react";
import { boot } from "@/lib/content";

/**
 * The screen the site starts on.
 *
 * A boot log prints itself a line at a time, then the notice about the two
 * modes appears with a button. The visitor leaves when they choose to —
 * the three seconds are for the log, not a gate on reading the notice.
 *
 * Under prefers-reduced-motion the whole thing is there at once. Skipping
 * it entirely would skip the notice too, which is the part that matters.
 */

/** Between printed lines, and how long before the notice shows. */
const STEP = 420;
const HOLD = 3000;
const FADE = 320;

function prefersReduced() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function Boot() {
  // Starts at zero lines so the first paint is the empty frame, which is
  // what makes the log read as printing rather than as already-printed.
  const [printed, setPrinted] = useState(0);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (prefersReduced()) {
      setPrinted(boot.lines.length);
      setReady(true);
      return;
    }

    const timers = boot.lines.map((_, i) =>
      window.setTimeout(() => setPrinted(i + 1), STEP * (i + 1)),
    );
    timers.push(window.setTimeout(() => setReady(true), HOLD));
    return () => timers.forEach(clearTimeout);
  }, []);

  // The button is the only thing to do here, so the keyboard lands on it.
  useEffect(() => {
    if (ready) button.current?.focus();
  }, [ready]);

  useEffect(() => {
    if (!ready || leaving) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        leave();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function leave() {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => setGone(true), prefersReduced() ? 0 : FADE);
  }

  if (gone) return null;

  return (
    <div
      className={`boot ${leaving ? "boot-leaving" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={boot.title}
    >
      <div className="boot-panel">
        <div className="text-muted">{boot.title}</div>

        {/* Every row is laid out from the first frame and the ones still
            to come are only made invisible, so the panel holds its height
            instead of growing a line at a time under the reader. */}
        <div className="mt-5 space-y-1" role="status" aria-live="polite">
          {boot.lines.map((line, i) => {
            const done = i < printed;
            return (
              <div
                key={line.label}
                className={`flex items-baseline gap-3 ${done ? "boot-line" : "boot-pending"}`}
                aria-hidden={done ? undefined : true}
              >
                <span className="text-ok" aria-hidden="true">
                  ::
                </span>
                <span className="min-w-0 flex-1 text-ink">{line.label}</span>
                {done ? (
                  <span className="shrink-0 text-accent">{line.value}</span>
                ) : i === printed ? (
                  // Blinks in the result column, so something is moving
                  // while the rest is still coming.
                  <span className="boot-cursor shrink-0" />
                ) : null}
              </div>
            );
          })}
        </div>

        {ready ? (
          <div className="boot-notice mt-8 border-t border-line pt-6">
            <p className="max-w-[62ch] text-ink">
              <span className="select-none text-ok/70" aria-hidden="true">
                {"# "}
              </span>
              {boot.notice}
            </p>

            <div className="mt-6 flex items-center gap-4">
              <button ref={button} type="button" onClick={leave} className="boot-button">
                {boot.action}
              </button>
              <span className="text-muted">{boot.hint}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
