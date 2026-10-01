"use client";

import { useEffect } from "react";
import { landing } from "@/lib/content";
import { Prompt } from "./TerminalOutput";
import type { Mode } from "@/lib/modes";

/**
 * The landing screen. Two ways in, both a click, neither one the
 * "advanced" one.
 */
export default function ModePicker({
  onPick,
  keyboard = true,
}: {
  onPick: (mode: Mode) => void;
  /** Off for unfocused windows, or every open picker would answer at once. */
  keyboard?: boolean;
}) {
  // Typing 1 or 2 works as well, for anyone who'd rather. It's never the
  // only way to choose.
  useEffect(() => {
    if (!keyboard) return;
    function onKey(e: KeyboardEvent) {
      const option = landing.options.find((o) => o.key === e.key);
      if (option && !e.metaKey && !e.ctrlKey && !e.altKey) onPick(option.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPick, keyboard]);

  return (
    <div className="scroller flex-1 overflow-y-auto px-6 py-7 sm:px-10 sm:py-9">
      <Prompt command={landing.command} />

      <p className="mt-6 max-w-[64ch] text-ink">{landing.intro}</p>

      <div className="mt-7 space-y-3 sm:max-w-[52ch]">
        {landing.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onPick(option.id)}
            className="group flex w-full items-start gap-5 border border-line px-5 py-5 text-left hover:border-accent hover:bg-tint focus-visible:border-accent focus-visible:bg-tint"
          >
            <span className="shrink-0 text-accent">[ {option.key} ]</span>
            <span>
              <span className="block text-ink">{option.title}</span>
              <span className="block text-muted">{option.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <p className="mt-7 max-w-[64ch] text-muted">
        Either one shows you the same things. You can swap between them whenever you like.
      </p>
    </div>
  );
}
